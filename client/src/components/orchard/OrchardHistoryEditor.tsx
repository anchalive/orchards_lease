import { useEffect, useState } from 'react';
import { Button, Input, Textarea, Card } from '@/components/ui';
import type { HistoryEntry, Treatment } from '@/types';

export default function OrchardHistoryEditor({
  value = [],
  onChange,
  readOnly = false,
  title = 'Pest & Disease History',
}: {
  value?: HistoryEntry[];
  onChange?: (v: HistoryEntry[]) => void;
  readOnly?: boolean;
  title?: string;
}) {
  const [items, setItems] = useState<HistoryEntry[]>(Array.isArray(value) ? value : []);

  useEffect(() => setItems(Array.isArray(value) ? value : []), [value]);
  useEffect(() => onChange && onChange(items), [items]);

  const addEntry = () => {
    setItems((s) => [
      ...s,
      { incidentDate: new Date().toISOString().slice(0, 10), season: '', items: [], severity: '', description: '', treatments: [] },
    ]);
  };

  const removeEntry = (i: number) => setItems((s) => s.filter((_, idx) => idx !== i));

  const updateEntry = (i: number, patch: Partial<HistoryEntry>) =>
    setItems((s) => s.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const addTreatment = (entryIdx: number) => {
    updateEntry(entryIdx, { treatments: [...(items[entryIdx].treatments || []), { date: new Date().toISOString().slice(0, 10), method: '', chemicals: [], notes: '' }] });
  };

  const updateTreatment = (entryIdx: number, tIdx: number, patch: Partial<Treatment>) => {
    const next = (items[entryIdx].treatments || []).map((t, idx) => (idx === tIdx ? { ...t, ...patch } : t));
    updateEntry(entryIdx, { treatments: next });
  };

  const removeTreatment = (entryIdx: number, tIdx: number) => {
    const next = (items[entryIdx].treatments || []).filter((_, idx) => idx !== tIdx);
    updateEntry(entryIdx, { treatments: next });
  };

  if (readOnly) {
    if (!items || items.length === 0) return null;
    return (
      <section>
        <h2 className="mb-3.5 font-serif text-[19px] font-semibold">{title}</h2>
        <div className="space-y-4">
          {items.map((e, i) => (
            <Card key={i} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-bold">{e.season || e.incidentDate}</div>
                <div className="text-sm text-faint">{new Date(e.incidentDate).toLocaleDateString()}</div>
              </div>
              <div className="mb-2 text-sm text-ink">{e.items?.join(', ')}</div>
              {e.description && <p className="mb-2 text-sm text-faint">{e.description}</p>}
              {e.treatments && e.treatments.length > 0 && (
                <div className="mt-2 text-sm">
                  <div className="mb-1 font-semibold">Treatments</div>
                  <ul className="list-inside list-disc text-sm text-faint">
                    {(e.treatments ?? []).map((t, j) => (
                      <li key={j}>{`${new Date(t.date).toLocaleDateString()} · ${t.method || ''} ${t.chemicals?.length ? `· ${t.chemicals.join(', ')}` : ''}`}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3.5 font-serif text-[19px] font-semibold">{title}</h2>
      <div className="space-y-3">
        {items.map((e, i) => (
          <Card key={i} className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <Input label="Incident date" type="date" value={e.incidentDate?.slice(0, 10) || ''} onChange={(ev) => updateEntry(i, { incidentDate: ev.target.value })} />
              <div className="ml-3 w-48">
                <Input label="Season" value={e.season || ''} onChange={(ev) => updateEntry(i, { season: ev.target.value })} />
              </div>
            </div>

            <Input label="Pests / Diseases (comma separated)" value={(e.items || []).join(', ')} onChange={(ev) => updateEntry(i, { items: ev.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
            <div className="mt-2">
              <Input label="Severity" value={e.severity || ''} onChange={(ev) => updateEntry(i, { severity: ev.target.value })} />
            </div>
            <div className="mt-2">
              <Textarea label="Description" value={e.description || ''} onChange={(ev) => updateEntry(i, { description: ev.target.value })} />
            </div>

            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold">Treatments</div>
                <Button variant="outline" onClick={() => addTreatment(i)} size="sm">Add treatment</Button>
              </div>
              {(e.treatments || []).map((t, j) => (
                <div key={j} className="mb-2 grid grid-cols-3 gap-2">
                  <Input label="Date" type="date" value={t.date?.slice(0, 10) || ''} onChange={(ev) => updateTreatment(i, j, { date: ev.target.value })} />
                  <Input label="Method" value={t.method || ''} onChange={(ev) => updateTreatment(i, j, { method: ev.target.value })} />
                  <Input label="Chemicals (comma separated)" value={(t.chemicals || []).join(', ')} onChange={(ev) => updateTreatment(i, j, { chemicals: ev.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
                  <div className="col-span-3">
                    <Textarea label="Notes" value={t.notes || ''} onChange={(ev) => updateTreatment(i, j, { notes: ev.target.value })} />
                  </div>
                  <div className="col-span-3 text-right">
                    <Button variant="ghost" onClick={() => removeTreatment(i, j)} size="sm">Remove</Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between">
              <Button variant="ghost" onClick={() => removeEntry(i)}>Remove entry</Button>
            </div>
          </Card>
        ))}

        <div>
          <Button onClick={addEntry}>Add history entry</Button>
        </div>
      </div>
    </section>
  );
}
