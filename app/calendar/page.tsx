'use client';

import { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { Calendar as CalendarIcon, Video, Clock, ExternalLink } from 'lucide-react';

interface Event {
  id: string;
  eventName: string;
  description: string;
  date: string;
  type: 'Call' | 'Deadline' | 'Launch' | 'Meeting';
  locationLink: string;
}

const typeConfig = {
  Call: { color: 'bg-blue-50 text-blue-700', icon: Video },
  Deadline: { color: 'bg-red-50 text-red-700', icon: Clock },
  Launch: { color: 'bg-purple-50 text-purple-700', icon: CalendarIcon },
  Meeting: { color: 'bg-green-50 text-green-700', icon: UsersIcon },
};

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  // Gruppiere Events nach Monat
  const groupedEvents = events.reduce((acc, event) => {
    const date = new Date(event.date);
    const month = date.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  return (
    <PageShell>
      <header className="mb-12">
        <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">Events & Deadlines</h1>
        <p className="text-zinc-500 font-medium">Wichtige Termine für die Community.</p>
      </header>

      {loading ? (
        <div className="space-y-8 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-8 w-32 bg-zinc-200 rounded-lg" />
              <div className="h-32 bg-zinc-100 rounded-3xl" />
            </div>
          ))}
        </div>
      ) : Object.keys(groupedEvents).length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-zinc-300 p-20 text-center">
          <CalendarIcon className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-400 font-bold text-lg">Keine anstehenden Termine.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedEvents).map(([month, monthEvents]) => (
            <div key={month}>
              <h2 className="text-2xl font-bold text-zinc-900 mb-6 sticky top-0 bg-zinc-50 py-4 z-10">
                {month}
              </h2>
              <div className="grid gap-4">
                {monthEvents.map((event) => {
                  const config = typeConfig[event.type] || typeConfig.Meeting;
                  const Icon = config.icon;
                  const eventDate = new Date(event.date);

                  return (
                    <div
                      key={event.id}
                      className="group bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col md:flex-row gap-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <div className="flex flex-col items-center justify-center bg-zinc-50 rounded-xl p-4 w-full md:w-24 text-center border border-zinc-100">
                        <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
                          {eventDate.toLocaleString('de-DE', { weekday: 'short' })}
                        </span>
                        <span className="text-3xl font-black text-zinc-900 leading-none my-1">
                          {eventDate.getDate()}
                        </span>
                        <span className="text-xs font-medium text-zinc-400">
                          {eventDate.getHours()}:{eventDate.getMinutes().toString().padStart(2, '0')}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                            <Icon className="w-3 h-3" />
                            {event.type}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 mb-2 truncate">
                          {event.eventName}
                        </h3>
                        <p className="text-sm text-zinc-500 leading-relaxed max-w-2xl">
                          {event.description}
                        </p>
                      </div>

                      <div className="flex items-center">
                        {event.locationLink && (
                          <a
                            href={event.locationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-zinc-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95"
                          >
                            Join Event <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}