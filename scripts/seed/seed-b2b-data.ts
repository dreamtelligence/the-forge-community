import fs from 'node:fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL missing. Define it in .env.local or .env before seeding.');
}

const pool = new pg.Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const b2bData = [
  // --- B2B HÄNDLER (Bereits vorhanden) ---
  { title: 'Valio Food GmbH', category: 'B2B_DIRECTORY', type: 'Gefriergetrocknete Früchte', description: 'Spezialist für gefriergetrocknete Obst-Zutaten', url: 'https://valio.de', location: 'Hamburg', contactInfo: { phone: '+49 40 3330 5920', email: 'sales@valio.de', address: 'Ernst-Merck-Straße 12-14, 20099 Hamburg' } },
  { title: 'Horst Walberg Trockenfrucht (Howa)', category: 'B2B_DIRECTORY', type: 'Trockenfrüchte', description: 'Lieferant für Trockenfrüchte aus Deutschland', url: 'https://howa.de', location: 'Kisdorf', contactInfo: { phone: '+49 4193 9819-0', email: 'info@howa.de', address: 'Henstedter Straße 21, 24629 Kisdorf' } },
  { title: 'Comazo GmbH + Co. KG', category: 'B2B_DIRECTORY', type: 'Unterwäsche', description: 'Hersteller von Unterwäsche für Damen und Herren aus Albstadt', url: 'https://comazo.de', location: 'Albstadt-Tailfingen', contactInfo: { phone: '+49 7432 7019-0', email: 'info@comazo.de', address: 'Martin-Luther-Str. 1, 72461 Albstadt' } },
  { title: 'TRIGEMA W. Grupp KG', category: 'B2B_DIRECTORY', type: 'Made in Germany', description: 'Deutschlands größter Hersteller von T-Shirts, Polos und Sweatshirts', url: 'https://trigema.de', location: 'Burladingen', contactInfo: { phone: '+49 7475 88-0', email: 'bestellservice@trigema.de', address: 'Josef-Mayer-Str. 31-35, 72393 Burladingen' } },
  { title: 'L-SHOP-TEAM GmbH', category: 'B2B_DIRECTORY', type: 'Textilien', description: 'Einer der größten Textilgroßhändler für T-Shirts und Hoodies', url: 'https://l-shop-team.de', location: 'Unna', contactInfo: { phone: '+49 2303 9019-0', email: 'info@l-shop-team.de', address: 'Otto-Hahn-Str. 27, 59423 Unna' } },

  // --- MODE & BEKLEIDUNG (NEU) ---
  {
    title: 'B2B Griffati',
    category: 'B2B_DIRECTORY',
    type: 'Designermode & Accessoires',
    description: 'Großhändler für Outlet-Designerware mit großer Marken- und Produktbreite sowie schnellen EU-Lieferungen.',
    url: 'https://www.griffati.com',
    location: 'Padua, Italien',
    contactInfo: { phone: '+39 049 825 8813', email: 'sales@griffati.com' }
  },
  {
    title: 'B2Brands (Marken Großhändler)',
    category: 'B2B_DIRECTORY',
    type: 'Markenbekleidung',
    description: 'Online-Großhändler für Outlet-Designerkleidung mit breitem Sortiment aus Luxus-, Sport- und Jeans-Kategorien.',
    url: 'https://www.b2brands.com',
    location: 'Deutschland',
    contactInfo: { phone: '09 72 31 67 88', email: 'contact@b2brands.com' }
  },
  {
    title: 'Paris Fashion Shops',
    category: 'B2B_DIRECTORY',
    type: 'Damenmode',
    description: 'B2B-Marktplatz für Damenmode mit vielen geprüften Lieferanten, niedrigen Mindestbestellwerten und schneller EU-Lieferung.',
    url: 'https://parisfashionshops.com',
    location: 'Paris, Frankreich',
    contactInfo: { phone: '01 43 52 08 08', email: 'help@parisfashionshops.com' }
  },
  {
    title: 'FashionGet',
    category: 'B2B_DIRECTORY',
    type: 'Damenmode & Accessoires',
    description: 'Italienischer Großhändler für Damenbekleidung; flexible Abnahmen (auch Einzelstücke) und schnelle EU-Lieferung.',
    url: 'https://www.fashionget.com',
    location: 'Italien',
    contactInfo: { phone: '+39 320 283 3830', email: 'fashiongetb2b@gmail.com' }
  },
  {
    title: 'BrandsGateway',
    category: 'B2B_DIRECTORY',
    type: 'Luxusmode',
    description: 'Luxuskleidung, Schuhe und Accessoires für B2B-Kunden; geeignet für Dropshipping und Großhandel.',
    url: 'https://brandsgateway.com',
    location: 'Schweden/International',
    contactInfo: { phone: '+1 844 235 2328', email: 'support@brandsgateway.com' }
  },

  // --- GEFRIERGETROCKNETE FRÜCHTE & ZUTATEN (NEU) ---
  {
    title: 'Paradise Fruits Solutions',
    category: 'B2B_DIRECTORY',
    type: 'Gefriergetrocknete Zutaten',
    description: 'Hersteller natürlicher gefriergetrockneter Zutaten; bietet maßgeschneiderte Lösungen und hohe Qualitätsstandards.',
    url: 'https://www.paradisefruits.com',
    location: 'Deutschland',
    contactInfo: { phone: '+49 4148 615 111', email: 'solutions@paradisefruits.com' }
  },
  {
    title: 'Paradise Fruits Freeze Dried',
    category: 'B2B_DIRECTORY',
    type: 'Gefriergetrocknete Früchte',
    description: 'Deutscher Hersteller für gefriergetrocknete Früchte mit Fokus auf Lebensmittelindustrie und Private Label.',
    url: 'https://www.paradisefreezedry.de',
    location: 'Deutschland',
    contactInfo: { phone: '+49 3901 307 900', email: 'fd@paradisefreezedry.de' }
  },
  {
    title: "Nature's Element",
    category: 'B2B_DIRECTORY',
    type: 'Gefriergetrocknete Früchte & Gemüse',
    description: 'Bulk-Lieferant mit flexiblen Texturen, niedriger Mindestbestellmenge und schneller EU-Lieferung.',
    url: 'https://natureselement.eu',
    location: 'Litauen/Polen',
    contactInfo: { phone: '+353 45 913 242', email: 'info@natureselement.eu' }
  },
  {
    title: 'Vitachem',
    category: 'B2B_DIRECTORY',
    type: 'Gefriergetrocknete Früchte',
    description: 'Bulk-Lieferant mit zertifizierter Rohware (IFS, Bio, Kosher, Halal). Flexible Bestellmengen und schnelle Lieferzeiten.',
    url: 'https://www.vitachem.eu',
    location: 'Slowakei',
    contactInfo: { phone: '+421 948 545 231 / +43 676 423 94 98', email: 'info@vitachem.eu' }
  },
  {
    title: 'Nutrada',
    category: 'B2B_DIRECTORY',
    type: 'B2B Marktplatz (Food Ingredients)',
    description: 'Online-Plattform für zertifizierte Hersteller gefriergetrockneter Produkte; Filter nach Herkunft, Qualität und Zertifizierungen.',
    url: 'https://nutrada.com',
    location: 'Online/EU',
    contactInfo: { phone: '+31 10 322 0290', email: 'hello@nutrada.com' }
  },
  {
    title: 'Droogfruit.nl',
    category: 'B2B_DIRECTORY',
    type: 'Gefriergetrocknete Früchte',
    description: 'Spezialist für gefriergetrocknete Früchte ohne Zusatzstoffe; breite Sortenvielfalt.',
    url: 'https://droogfruit.nl',
    location: 'Niederlande',
    contactInfo: { phone: 'WhatsApp 0623957690', email: 'info@droogfruit.nl' }
  },
  {
    title: 'European Freeze Dry',
    category: 'B2B_DIRECTORY',
    type: 'Gefriergetrocknete Zutaten & Lohnproduktion',
    description: 'Seit 1964; Werke in Dänemark und UK. Bietet Zutaten, Mahlzeiten, Tierfutter sowie Lohngefriertrocknung.',
    url: 'https://europeanfreezedry.com',
    location: 'Dänemark/UK',
    contactInfo: { phone: '+45 46 400 200 / +44 1772 654 441', email: 'sales@europeanfreezedry.com' }
  },

  // --- B2B DISTRIBUTOREN & TECHNOLOGIE (NEU) ---
  {
    title: 'Ingram Micro',
    category: 'B2B_DIRECTORY',
    type: 'IT & Technologie-Distribution',
    description: 'Globaler Technologie-Distributor; aktiv in fast 200 Ländern. 2024: 48 Mrd. US-$ Umsatz, >23.500 Mitarbeitende. B2B-Plattform mit B2C-ähnlicher Experience und finanziellen Vorteilen.',
    url: 'https://www.ingrammicro.com',
    location: 'USA/Global',
    contactInfo: { phone: '+32 2254 9211 / +32 2254 9930', email: 'besmb@ingrammicro.com' }
  },
  {
    title: 'Esprinet',
    category: 'B2B_DIRECTORY',
    type: 'IT & Unterhaltungselektronik',
    description: 'Multinationaler Marktführer in der B2B-Distribution von IT- und Consumer-Elektronik; unterstützt Unternehmen bei der Digitalisierung und betreibt ein großes Netz professioneller Wiederverkäufer.',
    url: 'https://www.esprinet.com',
    location: 'Italien (Südeuropa)',
    contactInfo: { phone: '+34 976 766 110', email: 'comercial@esprinet.com' }
  },
  {
    title: 'BigBuy',
    category: 'B2B_DIRECTORY',
    type: 'E-Commerce Distributor / Dropshipping',
    description: 'All-in-one E-Commerce-Partner mit 200.000 Produkten und 5.000 Marken. Bietet Dropshipping- und Großhandels-Services sowie Logistik- und Integrationslösungen für Online-Händler.',
    url: 'https://www.bigbuy.eu',
    location: 'Spanien',
    contactInfo: { phone: '+34 96 115 04 22', email: 'customers@bigbuy.eu' }
  },
  {
    title: 'Techancy',
    category: 'B2B_DIRECTORY',
    type: 'Consumer Electronics Zubehör',
    description: 'Distributor für Ladekabel, Kopfhörer, Lautsprecher u. a. Fokus auf Qualitätsauswahl, persönliche Betreuung und flexible Konditionen für Wiederverkäufer.',
    url: 'https://www.techancy.com',
    location: 'Portugal',
    contactInfo: { phone: '+351 966 666 608', email: 'info@techancy.com' }
  },
  {
    title: 'Innpro',
    category: 'B2B_DIRECTORY',
    type: 'Consumer Electronics & Smart Home',
    description: 'Breites Portfolio (Kleingeräte, Smart Home, Gaming, Foto/Video, Energie, Autozubehör, IT-Zubehör u. v. m.). Vorteile: Großhandelsrabatte, Zahlungsaufschub, schnelle Abwicklung (98% same-day) und mehrsprachiger Support.',
    url: 'https://innpro.eu',
    location: 'Polen',
    contactInfo: { phone: '+48 600 983 834 / +48 532 927 310', email: 'contact@innpro.eu' }
  },
  {
    title: 'Rutronik',
    category: 'B2B_DIRECTORY',
    type: 'Elektronische Bauelemente',
    description: 'Unabhängiges Familienunternehmen; Broadline-Distributor für Halbleiter, passive/elektromechanische Komponenten, Boards, Speichertechnik, Displays und Funkprodukte. 2023: 1,243 Mrd. € Umsatz, >1.900 Mitarbeitende. E-Commerce via Rutronik24.',
    url: 'https://www.rutronik.com',
    location: 'Deutschland',
    contactInfo: { phone: '+49 7231 801-0', email: 'rutronik@rutronik.com' }
  },
  {
    title: 'RS Components / RS Group',
    category: 'B2B_DIRECTORY',
    type: 'Industrie- & Elektronik-Komponenten',
    description: 'Globaler B2B-Partner mit über 800.000 lagernden Produkten von 2.500+ Lieferanten. 100+ Jahre Erfahrung; End-to-End Lösungen für Beschaffung, Wartung & Inventar-Management. RS PRO + DesignSpark.',
    url: 'https://www.rsgroup.com',
    location: 'UK (32 Länder)',
    contactInfo: { phone: '03457 201201', email: 'uk.marketing@rsgroup.com' }
  },
  {
    title: 'Premier Farnell (Farnell)',
    category: 'B2B_DIRECTORY',
    type: 'Elektronische Komponenten & Industrieprodukte',
    description: 'Distributor für elektronische Komponenten und Industrieprodukte; tätig in 36 Ländern und Handel in 100+ Ländern. Seit 2016 Teil von Avnet; liefert für Systemdesign, Wartung und Reparatur.',
    url: 'https://www.farnell.com',
    location: 'UK (Avnet)',
    contactInfo: { phone: '03447 11 11 11', email: 'sales@farnell.com' }
  },
  {
    title: 'TME (Transfer Multisort Elektronik)',
    category: 'B2B_DIRECTORY',
    type: 'Elektronik & Industrieautomation',
    description: '350.000+ Produkte, 300.000+ Kunden in 150 Ländern. Hohe Lagerverfügbarkeit und Versand meist am selben Tag; 800+ Mitarbeitende.',
    url: 'https://www.tme.eu',
    location: 'Polen',
    contactInfo: { phone: '+48 42 645 54 44', email: 'export@tme.eu' }
  },
  {
    title: 'Tech Data / TD SYNNEX',
    category: 'B2B_DIRECTORY',
    type: 'IT, Kommunikation & Consumer Electronics',
    description: 'Führender Distributor; in UK 30.000+ Artikel von 150+ Herstellern mit Next-Day-Lieferung. Unterstützt 125.000 Wiederverkäufer in 100+ Ländern.',
    url: 'https://www.tdsynnex.fr',
    location: 'USA/Global (UK & Irland in Europa)',
    contactInfo: { phone: '0825 32 80 00 / 0800 807 022', email: 'select@tdsynnex.fr; ouverture@tdsynnex.fr' }
  },
  {
    title: 'ALSO Holding',
    category: 'B2B_DIRECTORY',
    type: 'ICT Distribution & Services',
    description: 'Führender Technologieanbieter für die ICT-Branche: aktiv in 28 EU-Ländern, PaaS in 143 Ländern. 120.000 Reseller, 700+ Hersteller, 1.450+ Produktkategorien. Bereiche: Supply, Solutions, Service.',
    url: 'https://www.also.com',
    location: 'Schweiz'
  },
  {
    title: 'Conrad Electronic',
    category: 'B2B_DIRECTORY',
    type: 'Elektronik & Technik (Multi-Channel)',
    description: 'Europäischer Multi-Channel-Händler für Elektronik & Technik. B2B-Beschaffungsplattform; 2022 kamen 70% des Umsatzes aus B2B. Marktplatz seit 2017, Conrad Sourcing Platform seit 2020.',
    url: 'https://www.conrad.de',
    location: 'Deutschland'
  },
  {
    title: 'Distrelec (RS Group)',
    category: 'B2B_DIRECTORY',
    type: 'Technische Komponenten & Automation',
    description: 'Online- und Katalogdistributor für technische Komponenten, Automatisierung, Messtechnik, IT und Zubehör in Europa. Teil der RS Group.',
    url: 'https://www.distrelec.com',
    location: 'Schweiz/UK',
    contactInfo: { phone: '+41 44 944 99 11', email: 'info@distrelec.com' }
  },

  // --- LOGISTIK & LAGER (Bereits vorhanden) ---
  { title: 'FIEGE Logistik (Zentrale)', category: 'LOGISTICS', type: 'Kontraktlogistik', description: 'Führender Anbieter für Intralogistik und E-Commerce', url: 'https://fiege.com', location: 'Greven', contactInfo: { phone: '+49 2571 999-0', address: 'Joan-Joseph-Fiege-Straße 1, 48268 Greven' } },
  { title: 'Lufapak GmbH', category: 'LOGISTICS', type: 'B2B Fulfillment', description: 'Fulfillment, Lagerung, Versand und Retourenmanagement', url: 'https://lufapak.de', location: 'Neuwied', contactInfo: { phone: '+49 2631 384-0', email: 'sales@lufapak.de', address: 'Carl-Borgward-Straße 20, 56566 Neuwied' } },

  // --- NEU: VERSANDDIENSTLEISTER & PAKETDIENSTE (2026 Tarife) ---
  { 
    title: 'DHL Paket (Deutsche Post)', 
    category: 'LOGISTICS', 
    type: 'Shipping Service', 
    description: 'Größter deutscher Paketdienstleister; B2B- und B2C-Versand national und international, Abholservice, Packstationen.', 
    url: 'https://dhl.de', 
    location: 'Bonn', 
    contactInfo: { 
      phone: '0228 4333112', 
      address: 'Heinrich-von-Stephan-Straße 1, 53175 Bonn',
      prices_2026: {
        'Päckchen S (bis 2kg)': '4,19 €',
        'Paket bis 5kg': '7,69 €',
        'Paket bis 10kg': '10,49 €',
        'Abholservice (je Auftrag)': '+3,00 €'
      }
    } 
  },
  { 
    title: 'Hermes Germany', 
    category: 'LOGISTICS', 
    type: 'Shipping Service', 
    description: 'Zweitgrößter Paketdienst in Deutschland; Fokus auf PaketShops und flexible Haustür-Zustellung.', 
    url: 'https://myhermes.de', 
    location: 'Hamburg', 
    contactInfo: { 
      email: 'impressum@hermesworld.com',
      address: 'Essener Straße 89, 22419 Hamburg',
      prices_2026: {
        'Päckchen (Shop)': '3,99 €',
        'S-Paket (Haus)': '5,79 €',
        'M-Paket (Haus)': '6,99 €'
      }
    } 
  },
  { 
    title: 'DPD Deutschland', 
    category: 'LOGISTICS', 
    type: 'Shipping Service', 
    description: 'Internationales Paketnetzwerk mit starkem Fokus auf Shop2Shop-Versand und Classic-Zustellung.', 
    url: 'https://dpd.de', 
    location: 'Aschaffenburg', 
    contactInfo: { 
      phone: '06021 8430',
      email: 'info@dpd.de',
      address: 'Wailandtstraße 1, 63741 Aschaffenburg',
      prices_2026: {
        'Shop2Shop XS': '3,49 €',
        'Classic XS (Haus)': '4,59 €',
        'Classic mit Abholung': 'ab 7,79 €'
      }
    } 
  },
  { 
    title: 'GLS Germany', 
    category: 'LOGISTICS', 
    type: 'Shipping Service', 
    description: 'Nationaler und europaweiter Paketdienst mit Fokus auf Schnelligkeit und Transparenz.', 
    url: 'https://gls-germany.com', 
    location: 'Neuenstein', 
    contactInfo: { 
      phone: '06677 646907000',
      email: 'impressum@gls-germany.com',
      address: 'GLS Germany-Straße 1–7, 36286 Neuenstein',
      prices_2026: {
        'XS (Online)': '3,29 €',
        'S (Online)': '3,89 €',
        'International (Euro Zone I)': 'ab 9,70 €'
      }
    } 
  },
  { 
    title: 'UPS Deutschland', 
    category: 'LOGISTICS', 
    type: 'Express Logistik', 
    description: 'Weltweiter Express-Dienstleister; spezialisiert auf B2B-Fracht und zeitkritische Lieferungen.', 
    url: 'https://ups.com', 
    location: 'Neuss', 
    contactInfo: { 
      phone: '+49 69 66405060',
      email: 'CustomerServiceDEDE@ups.com',
      address: 'Görlitzer Straße 1, 41460 Neuss',
      prices_2026: {
        'UPS Standard (bis 2kg)': '6,74 €',
        'UPS Express Saver': 'ab 16,87 €'
      }
    } 
  },
  { 
    title: 'GO! Express & Logistics', 
    category: 'LOGISTICS', 
    type: 'Kurierservice', 
    description: 'Same-Day-Kurier und Overnight-Express Spezialist für extrem zeitkritische Sendungen.', 
    url: 'https://general-overnight.com', 
    location: 'Bonn', 
    contactInfo: { 
      phone: '0800 859 9999',
      email: 'info@general-overnight.com',
      address: 'Brühler Straße 9, 53119 Bonn'
    } 
  },
  { 
    title: 'trans-o-flex Express', 
    category: 'LOGISTICS', 
    type: 'Pharma Logistik', 
    description: 'B2B-Spezialist für temperaturgeführte Transporte (Pharma/Kosmetik) und sensible Waren.', 
    url: 'https://tof.de', 
    location: 'Weinheim', 
    contactInfo: { 
      phone: '+49 6201 988 0',
      email: 'innovation@tof.de',
      address: 'Hertzstraße 10, 69469 Weinheim'
    } 
  },
  { 
    title: 'PostModern (Regional)', 
    category: 'LOGISTICS', 
    type: 'Versandservice', 
    description: 'Regionaler Postdienst aus Dresden; bietet Briefpost, Pakete und Fulfillment für B2B.', 
    url: 'https://post-modern.de', 
    location: 'Dresden', 
    contactInfo: { 
      phone: '0800 996 6331',
      email: 'info@post-modern.de',
      address: 'Meinholdstraße 2, 01129 Dresden',
      prices_2026: {
        'Paketschein (bis 2kg)': '5,39 €',
        'Abholgebühr': '3,00 €'
      }
    } 
  },
  { 
    title: 'PIN AG (Berlin)', 
    category: 'LOGISTICS', 
    type: 'Versandservice', 
    description: 'Berliner Brief- und Paketdienst; Fokus auf CO2-freie Stadtlogistik und CO2-neutralen Versand.', 
    url: 'https://pin-ag.de', 
    location: 'Berlin', 
    contactInfo: { 
      phone: '030 577978-0',
      email: 'info@pin-ag.de',
      address: 'Alt-Moabit 91, 10559 Berlin'
    } 
  },
  { 
    title: 'CITIPOST', 
    category: 'LOGISTICS', 
    type: 'Versandservice', 
    description: 'Regionaler Brief- und Paketdienst in Niedersachsen/Bremen; kostengünstige Alternativen.', 
    url: 'https://citipost.de', 
    location: 'Hannover', 
    contactInfo: { 
      phone: '0800 05110511',
      email: 'service@citipost.de',
      address: 'Lilienthalstraße 19, 30179 Hannover',
      prices_2026: {
        'Paket bis 3kg': '6,19 €',
        'Briefporto Standard': '0,90 €'
      }
    } 
  }
];

async function main() {
  console.log(`Seeding ${b2bData.length} Professional Resources...`);
  for (const item of b2bData) {
    const id = `res_${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    await prisma.resource.upsert({
      where: { id },
      update: {
        title: item.title,
        category: item.category,
        type: item.type,
        description: item.description,
        url: item.url,
        location: item.location,
        contactInfo: item.contactInfo as any,
      },
      create: {
        id,
        title: item.title,
        category: item.category,
        type: item.type,
        description: item.description,
        url: item.url,
        location: item.location,
        contactInfo: item.contactInfo as any,
      },
    });
  }
  console.log('Enterprise-grade resource seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
