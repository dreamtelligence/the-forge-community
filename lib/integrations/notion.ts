import { Client } from '@notionhq/client';

const apiKey = (process.env.NOTION_API_KEY || '').trim();
if (!apiKey) {
  console.warn("WARNUNG: NOTION_API_KEY fehlt in den Environment Variables. Notion-Funktionen werden fehlschlagen.");
}

const notion = new Client({
  auth: apiKey || 'dummy-key-to-prevent-crash',
});

const databaseId = (process.env.NOTION_DATABASE_ID || '').trim();
const votesDatabaseId = (process.env.NOTION_VOTES_DATABASE_ID || '').trim();
const transactionsDatabaseId = (process.env.NOTION_TRANSACTIONS_DATABASE_ID || '').trim();
const forumDatabaseId = (process.env.NOTION_FORUM_DATABASE_ID || '').trim();
const announcementsDatabaseId = (process.env.NOTION_ANNOUNCEMENTS_DATABASE_ID || '').trim();

type NotionSource = {
  type: 'database' | 'data_source';
  id: string; // The resolved ID to use
  properties: Map<string, string>; // Name -> Type
};

const sourceCache = new Map<string, NotionSource>();

async function resolveNotionSource(id: string): Promise<NotionSource> {
  const cleanId = id.trim();
  const cached = sourceCache.get(cleanId);
  if (cached) return cached;
  if (!cleanId) throw new Error('Notion ID not set');

  try {
    if ((notion as any).dataSources) {
      const dataSource = await (notion as any).dataSources.retrieve({ data_source_id: cleanId });
      if (dataSource && dataSource.properties) {
        const properties = new Map<string, string>();
        Object.entries(dataSource.properties).forEach(([name, prop]: [string, any]) => {
          properties.set(name, prop.type);
        });
        const resolved: NotionSource = { type: 'data_source', id: cleanId, properties };
        sourceCache.set(cleanId, resolved);
        return resolved;
      }
    }
  } catch (_error) {}

  const database = await notion.databases.retrieve({ database_id: cleanId });
  const properties = new Map<string, string>();
  
  if ((database as any).properties) {
    Object.entries((database as any).properties).forEach(([name, prop]: [string, any]) => {
      properties.set(name, prop.type);
    });
    const resolved: NotionSource = { type: 'database', id: cleanId, properties };
    sourceCache.set(cleanId, resolved);
    return resolved;
  }

  if ((database as any).data_sources?.length > 0) {
    const dsId = (database as any).data_sources[0].id;
    const ds = await (notion as any).dataSources.retrieve({ data_source_id: dsId });
    if (ds && ds.properties) {
      Object.entries(ds.properties).forEach(([name, prop]: [string, any]) => {
        properties.set(name, prop.type);
      });
      const resolved: NotionSource = { type: 'data_source', id: dsId, properties };
      sourceCache.set(cleanId, resolved);
      return resolved;
    }
  }

  return { type: 'database', id: cleanId, properties };
}

async function performQuery(source: NotionSource, _id: string, query: any) {
  const targetId = source.id.trim();
  if (source.type === 'data_source' && (notion as any).dataSources) {
    return await (notion as any).dataSources.query({ data_source_id: targetId, ...query });
  }
  if ((notion.databases as any).query) {
    return await (notion.databases as any).query({ database_id: targetId, ...query });
  }
  if ((notion as any).dataSources && (notion as any).dataSources.query) {
    return await (notion as any).dataSources.query({ data_source_id: targetId, ...query });
  }
  throw new Error('No query method found on Notion client');
}

function selectPropertyName(available: Map<string, string>, candidates: string[]): string | null {
  return candidates.find((name) => available.has(name)) || null;
}

function getProperty(page: any, available: Map<string, string>, candidates: string[]): any {
  const name = selectPropertyName(available, candidates);
  return name ? page.properties[name] : null;
}

function getText(property: any): string {
  if (!property) return '';
  if (property.title) return property.title.map((t: any) => t.plain_text).join('');
  if (property.rich_text) return property.rich_text.map((t: any) => t.plain_text).join('');
  if (property.people) return property.people.map((p: any) => p.name || p.id).join(', ');
  if (property.email) return property.email;
  if (property.phone_number) return property.phone_number;
  if (property.url) return property.url;
  return '';
}

function getStatus(property: any): string {
  if (!property) return '';
  if (property.status) return property.status.name;
  if (property.select) return property.select.name;
  return '';
}

export interface Founder {
  id: string;
  name: string;
  email: string;
  founderNumber: number;
  joinedDate: string;
  status: 'pending' | 'active' | 'inactive';
  investmentPaid: boolean;
  groupId?: string;
  groupName?: string;
  plan?: string;
}

export async function getFounders(): Promise<Founder[]> {
  try {
    const source = await resolveNotionSource(databaseId);
    const founderNumberProp = selectPropertyName(source.properties, ['Founder Number', 'Gründernummer']) || 'Name';
    const query = { sorts: [{ property: founderNumberProp, direction: 'ascending' as const }] };
    const data = await performQuery(source, databaseId, query);
    return data.results.map((page: any) => {
      const props = source.properties;
      return {
        id: page.id,
        name: getText(getProperty(page, props, ['Name', 'Titel'])),
        email: getProperty(page, props, ['Email', 'E-Mail'])?.email || '',
        founderNumber: getProperty(page, props, ['Founder Number', 'Gründernummer'])?.number || 0,
        joinedDate: getProperty(page, props, ['Joined Date', 'Beitrittsdatum'])?.date?.start || '',
        status: getStatus(getProperty(page, props, ['Status'])) as any || 'pending',
        investmentPaid: getProperty(page, props, ['Investment Paid', 'Investment bezahlt'])?.checkbox || false,
        groupId: getProperty(page, props, ['Group', 'Gruppe'])?.relation?.[0]?.id || undefined,
        plan: getStatus(getProperty(page, props, ['Plan'])) || undefined,
      };
    });
  } catch (error) {
    console.error('Error fetching founders:', error);
    return [];
  }
}

export async function getFounderByEmail(email: string): Promise<Founder | null> {
  console.log(`NOTION: Suche Founder mit Email: ${email}`);
  if (!email || !databaseId) {
    console.error('NOTION: Email oder databaseId fehlt:', { email: !!email, databaseId: !!databaseId });
    return null;
  }
  
  try {
    const source = await resolveNotionSource(databaseId);
    console.log(`NOTION: Nutze Source-ID: ${source.id} (${source.type})`);
    
    const emailProp = selectPropertyName(source.properties, ['Email', 'E-Mail']);
    console.log(`NOTION: Email-Spalte gefunden: ${emailProp || 'KEINE'}`);
    
    let page: any = null;

    if (emailProp) {
      const filter = { property: emailProp, email: { equals: email.toLowerCase() } };
      const data = await performQuery(source, databaseId, { filter });
      console.log(`NOTION: Filter-Abfrage ergab ${data.results?.length || 0} Treffer`);
      if (data.results && data.results.length > 0) page = data.results[0];
    }

    if (!page) {
      console.log('NOTION: Kein Treffer per Filter, starte manuellen Scan...');
      const data = await performQuery(source, databaseId, { page_size: 100 });
      console.log(`NOTION: Scan prüft ${data.results?.length || 0} Einträge`);
      page = data.results.find((p: any) => {
        const e = (Object.values(p.properties).find((v: any) => v.type === 'email') as any)?.email;
        const match = e?.toLowerCase() === email.toLowerCase();
        if (match) console.log(`NOTION: Manueller Treffer gefunden: ${e}`);
        return match;
      });
    }

    if (!page) {
      console.warn(`NOTION: Email ${email} wurde in keiner Datenbank-Spalte gefunden.`);
      return null;
    }
    const props = source.properties;
    let groupName = undefined;
    const groupId = getProperty(page, props, ['Group', 'Gruppe'])?.relation?.[0]?.id;
    if (groupId) {
      try {
        const groupPage = await notion.pages.retrieve({ page_id: groupId });
        groupName = (groupPage as any).properties?.Name?.title?.[0]?.plain_text;
      } catch (_e) {}
    }
    return {
      id: page.id,
      name: getText(getProperty(page, props, ['Name', 'Titel'])),
      email: email,
      founderNumber: getProperty(page, props, ['Founder Number', 'Gründernummer'])?.number || 0,
      joinedDate: getProperty(page, props, ['Joined Date', 'Beitrittsdatum'])?.date?.start || '',
      status: getStatus(getProperty(page, props, ['Status'])) as any || 'pending',
      investmentPaid: getProperty(page, props, ['Investment Paid', 'Investment bezahlt'])?.checkbox || false,
      groupId,
      groupName,
      plan: getStatus(getProperty(page, props, ['Plan'])) || undefined,
    };
  } catch (_error) { return null; }
}

export async function addFounder(data: any): Promise<any> {
  try {
    const founders = await getFounders();
    const source = await resolveNotionSource(databaseId);
    const props = source.properties;
    const properties: any = {
      [selectPropertyName(props, ['Name', 'Titel']) || 'Name']: { title: [{ text: { content: data.name } }] },
      [selectPropertyName(props, ['Email', 'E-Mail']) || 'Email']: { email: data.email },
      [selectPropertyName(props, ['Founder Number', 'Gründernummer']) || 'Founder Number']: { number: founders.length + 1 },
      [selectPropertyName(props, ['Status']) || 'Status']: { select: { name: 'pending' } }
    };
    return await notion.pages.create({ parent: { database_id: databaseId.trim() }, properties });
  } catch (error) { throw error; }
}

export async function updateFounderStatus(id: string, status: string, plan?: string): Promise<any> {
  try {
    const source = await resolveNotionSource(databaseId);
    const statusProp = selectPropertyName(source.properties, ['Status']) || 'Status';
    const properties: any = { [statusProp]: { select: { name: status } } };
    if (plan) {
      const planProp = selectPropertyName(source.properties, ['Plan']);
      if (planProp) properties[planProp] = { select: { name: plan.charAt(0).toUpperCase() + plan.slice(1) } };
    }
    return await notion.pages.update({ page_id: id, properties });
  } catch (error) { throw error; }
}

// VOTES
export async function getVotes(): Promise<any[]> {
  try {
    const source = await resolveNotionSource(votesDatabaseId);
    const data = await performQuery(source, votesDatabaseId, {});
    return data.results.map((p: any) => ({
      id: p.id,
      name: getText(getProperty(p, source.properties, ['Name', 'Titel'])),
      votes: getProperty(p, source.properties, ['Votes', 'Stimmen'])?.number || 0,
      status: getStatus(getProperty(p, source.properties, ['Status'])) || 'active'
    }));
  } catch (_error) { return []; }
}

export async function updateVoteCount(id: string, delta: number): Promise<number> {
  const page: any = await notion.pages.retrieve({ page_id: id });
  const currentVotes = page.properties.Votes?.number || 0;
  const nextVotes = Math.max(0, currentVotes + delta);
  await notion.pages.update({ page_id: id, properties: { Votes: { number: nextVotes } } });
  return nextVotes;
}

// TRANSACTIONS
export async function getTransactions(): Promise<any[]> {
  try {
    const source = await resolveNotionSource(transactionsDatabaseId);
    const data = await performQuery(source, transactionsDatabaseId, { sorts: [{ property: 'Date', direction: 'descending' }] });
    return data.results.map((p: any) => ({
      id: p.id,
      description: getText(getProperty(p, source.properties, ['Description', 'Beschreibung'])),
      amount: getProperty(p, source.properties, ['Amount', 'Betrag'])?.number || 0,
      type: getStatus(getProperty(p, source.properties, ['Type', 'Typ']))
    }));
  } catch (_error) { return []; }
}

export async function addTransaction(data: any): Promise<any> {
  const source = await resolveNotionSource(transactionsDatabaseId);
  const props = source.properties;
  const properties: any = {
    [selectPropertyName(props, ['Description', 'Beschreibung']) || 'Description']: { title: [{ text: { content: data.description } }] },
    'Amount': { number: data.amount },
    'Type': { select: { name: data.type } },
    'Date': { date: { start: data.date || new Date().toISOString() } }
  };
  return await notion.pages.create({ parent: { database_id: transactionsDatabaseId.trim() }, properties });
}

export async function getFinancialSummary() {
  const transactions = await getTransactions();
  const totalIncome = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
  return { totalIncome, totalExpenses, available: totalIncome - totalExpenses };
}

// FORUM
export async function getForumPosts(): Promise<any[]> {
  try {
    const source = await resolveNotionSource(forumDatabaseId);
    const data = await performQuery(source, forumDatabaseId, {});
    return await Promise.all(data.results.map(async (page: any) => {
      let comments: any[] = [];
      try {
        const blocks = await notion.blocks.children.list({ block_id: page.id });
        comments = blocks.results.filter((b: any) => b.type === 'callout').map((b: any) => {
          const text = b.callout.rich_text.map((t: any) => t.plain_text).join('');
          const parts = text.split(': ');
          return { author: parts.length > 1 ? parts[0] : 'Community', content: parts.length > 1 ? parts.slice(1).join(': ') : text, time: b.created_time };
        });
      } catch (_e) {}
      return {
        id: page.id,
        author: getText(getProperty(page, source.properties, ['Author', 'Autor'])) || 'Anonym',
        founderNumber: getProperty(page, source.properties, ['Founder Number', 'Gründernummer'])?.number || 0,
        content: getText(getProperty(page, source.properties, ['Content', 'Inhalt'])),
        category: getStatus(getProperty(page, source.properties, ['Category', 'Kategorie'])) || 'General',
        likes: getProperty(page, source.properties, ['Likes'])?.number || 0,
        createdTime: page.created_time,
        comments
      };
    }));
  } catch (_error) { return []; }
}

export async function addForumPost(data: any): Promise<any> {
  const source = await resolveNotionSource(forumDatabaseId);
  const props = source.properties;
  const categoryName = ['Ideas', 'Support', 'General'].includes(data.category) ? data.category : 'General';
  const properties: any = {
    [selectPropertyName(props, ['Name', 'Titel']) || 'Name']: { title: [{ text: { content: data.content.slice(0, 80) } }] },
    [selectPropertyName(props, ['Content', 'Inhalt']) || 'Content']: { rich_text: [{ text: { content: data.content } }] },
    [selectPropertyName(props, ['Author', 'Autor']) || 'Author']: { rich_text: [{ text: { content: data.author } }] },
    [selectPropertyName(props, ['Founder Number', 'Gründernummer']) || 'Founder Number']: { number: data.founderNumber || 0 },
    [selectPropertyName(props, ['Category', 'Kategorie']) || 'Category']: { select: { name: categoryName } },
    [selectPropertyName(props, ['Likes']) || 'Likes']: { number: 0 }
  };
  return await notion.pages.create({ parent: { database_id: forumDatabaseId.trim() }, properties });
}

export async function updateForumPostLikes(id: string, delta: number): Promise<number> {
  const page: any = await notion.pages.retrieve({ page_id: id });
  const currentVotes = page.properties.Likes?.number || 0;
  const nextVotes = Math.max(0, currentVotes + delta);
  await notion.pages.update({ page_id: id, properties: { Likes: { number: nextVotes } } });
  return nextVotes;
}

export async function updateForumPost(id: string, content: string): Promise<any> {
  return await notion.pages.update({ page_id: id, properties: { 
    Content: { rich_text: [{ text: { content } }] },
    Name: { title: [{ text: { content: content.slice(0, 80) } }] }
  }});
}

export async function deleteForumPost(id: string): Promise<any> {
  return await notion.pages.update({ page_id: id, archived: true });
}

export async function addForumComment(postId: string, author: string, content: string) {
  return await notion.blocks.children.append({
    block_id: postId,
    children: [{ object: 'block', type: 'callout', callout: { icon: { emoji: '💬' }, color: 'blue_background', rich_text: [{ type: 'text', text: { content: `${author}: ${content}` } }] } }]
  });
}

// ANNOUNCEMENTS
export async function getAnnouncements(): Promise<any[]> {
  try {
    const source = await resolveNotionSource(announcementsDatabaseId);
    const data = await performQuery(source, announcementsDatabaseId, { sorts: [{ property: 'Date', direction: 'descending' }] });
    return data.results.map((p: any) => ({
      id: p.id,
      title: getText(getProperty(p, source.properties, ['Title', 'Name'])),
      content: getText(getProperty(p, source.properties, ['Content', 'Description'])),
      publishedDate: getProperty(p, source.properties, ['Date'])?.date?.start || ''
    }));
  } catch (_error) { return []; }
}

export async function addAnnouncement(data: any): Promise<any> {
  const properties: any = {
    'Title': { title: [{ text: { content: data.title } }] },
    'Content': { rich_text: [{ text: { content: data.content } }] },
    'Date': { date: { start: new Date().toISOString() } }
  };
  return await notion.pages.create({ parent: { database_id: announcementsDatabaseId.trim() }, properties });
}

// TASKS & DOCUMENTS & EVENTS
export async function getTasks(): Promise<any[]> { return []; }
export async function addTask(_data?: any) { return null; }
export async function updateTaskStatus(_id?: string, _status?: string) { return null; }
export async function getDocuments() { return []; }
export async function addDocument(_data?: any) { return null; }
export async function getEvents() { return []; }
export async function addEvent(_data?: any) { return null; }
export async function getGroups(): Promise<any[]> { return []; }
export async function getUserKarma(name: string) {
  const posts = await getForumPosts();
  return posts.filter(p => p.author === name).reduce((s, p) => s + p.likes, 0);
}

export { notion };
