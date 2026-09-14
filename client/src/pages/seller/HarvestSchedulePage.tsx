import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Plus, Edit2, Trash2, Save, Sparkles, RefreshCw } from 'lucide-react';
import { orchardService } from '@/services/orchard.service';
import { Button, Input, Select, Card, PageLoader } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/apiClient';
import { titleCase } from '@/lib/format';
import { HarvestTimeline, MONTHS } from '@/components/orchard/HarvestTimeline';
import type { HarvestSeason, Orchard } from '@/types';

const inRange = (m: number, start: number, end: number) => {
  if (start <= end) {
    return m >= start && m <= end;
  } else {
    return m >= start || m <= end;
  }
};

export default function HarvestSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [orchard, setOrchard] = useState<Orchard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Harvest seasons list state
  const [seasons, setSeasons] = useState<HarvestSeason[]>([]);

  // Form state
  const [fruitName, setFruitName] = useState('');
  const [startMonth, setStartMonth] = useState(1);
  const [peakStartMonth, setPeakStartMonth] = useState(1);
  const [peakEndMonth, setPeakEndMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(1);

  // Edit states
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Suggestions for fruit names based on existing list
  const fruitSuggestions = ['Mango', 'Litchi', 'Apple', 'Pomegranate', 'Orange', 'Banana', 'Grapes', 'Guava', 'Papaya', 'Coconut'];

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    orchardService
      .listMine({ page: 1 })
      .then((res) => {
        const found = res.data.find((o) => o._id === id);
        if (found) {
          setOrchard(found);
          setSeasons(found.harvestSeasons || []);
        } else {
          toast.error('Orchard not found');
          navigate('/seller/orchards');
        }
      })
      .catch((err) => {
        toast.error(getErrorMessage(err));
        navigate('/seller/orchards');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, toast]);

  const validateSeasonInputs = (editingIdx: number | null): string | null => {
    if (!fruitName.trim()) {
      return 'Fruit name is required.';
    }

    const nameLower = fruitName.trim().toLowerCase();
    const isDuplicate = seasons.some((s, idx) => 
      idx !== editingIdx && s.fruitName.toLowerCase() === nameLower
    );
    if (isDuplicate) {
      return `A harvest schedule for "${titleCase(fruitName)}" already exists.`;
    }

    // Check if peakStartMonth falls within [startMonth, endMonth]
    if (!inRange(peakStartMonth, startMonth, endMonth)) {
      return 'Peak start month must fall within the overall harvest season.';
    }

    // Check if peakEndMonth falls within [startMonth, endMonth]
    if (!inRange(peakEndMonth, startMonth, endMonth)) {
      return 'Peak end month must fall within the overall harvest season.';
    }

    // Check that entire peak season is within harvest season
    const peakMonths = [];
    let curr = peakStartMonth;
    while (true) {
      peakMonths.push(curr);
      if (curr === peakEndMonth) break;
      curr = (curr % 12) + 1;
    }

    for (const pm of peakMonths) {
      if (!inRange(pm, startMonth, endMonth)) {
        return 'The entire peak season range must fall within the overall harvest season.';
      }
    }

    return null;
  };

  const handleAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateSeasonInputs(editingIndex);
    if (err) {
      setValidationError(err);
      return;
    }

    setValidationError(null);

    const newSeason: HarvestSeason = {
      fruitName: fruitName.trim(),
      startMonth,
      peakStartMonth,
      peakEndMonth,
      endMonth,
    };

    if (editingIndex !== null) {
      const updated = [...seasons];
      updated[editingIndex] = newSeason;
      setSeasons(updated);
      setEditingIndex(null);
      toast.success('Harvest season updated in preview');
    } else {
      setSeasons([...seasons, newSeason]);
      toast.success('Harvest season added to preview');
    }

    // Clear form
    resetForm();
  };

  const resetForm = () => {
    setFruitName('');
    setStartMonth(1);
    setPeakStartMonth(1);
    setPeakEndMonth(1);
    setEndMonth(1);
    setEditingIndex(null);
    setValidationError(null);
  };

  const handleEditClick = (idx: number) => {
    const s = seasons[idx];
    setFruitName(s.fruitName);
    setStartMonth(s.startMonth);
    setPeakStartMonth(s.peakStartMonth);
    setPeakEndMonth(s.peakEndMonth);
    setEndMonth(s.endMonth);
    setEditingIndex(idx);
    setValidationError(null);
  };

  const handleDeleteClick = (idx: number) => {
    const updated = seasons.filter((_, i) => i !== idx);
    setSeasons(updated);
    toast.success('Season removed from preview');
    if (editingIndex === idx) {
      resetForm();
    }
  };

  const handleSaveAll = async () => {
    if (!orchard) return;
    setSaving(true);
    try {
      await orchardService.updateHarvest(orchard._id, seasons);
      toast.success('Harvest schedule saved successfully!');
      navigate('/seller/orchards');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!orchard) return null;

  return (
    <div className="mx-auto max-w-[1080px] px-6 pb-16 pt-5">
      <Link
        to="/seller/orchards"
        className="mb-4 flex items-center gap-1.5 py-1 text-[13.5px] font-semibold text-sub"
      >
        <ChevronLeft className="h-[17px] w-[17px]" /> Back to orchards
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[27px] font-semibold">Harvest Schedule</h1>
          <p className="mt-1 text-[13.5px] text-faint">
            Manage fruit seasons and peak harvesting schedules for <b>{orchard.gardenName}</b>.
          </p>
        </div>
        <Button
          onClick={handleSaveAll}
          loading={saving}
          className="flex items-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-cream hover:bg-forest-dark"
        >
          <Save className="h-4 w-4" /> Save Schedule
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        
        {/* Left Column: Form & Schedule List */}
        <div className="space-y-6">
          
          {/* Season Form */}
          <Card className="p-6 space-y-4 border border-sand">
            <h2 className="font-serif text-lg font-bold text-ink">
              {editingIndex !== null ? '✏️ Edit Fruit Season' : '➕ Add Fruit Season'}
            </h2>
            
            <form onSubmit={handleAddOrUpdate} className="space-y-4">
              <div>
                <Input
                  label="Fruit Name"
                  placeholder="e.g. Mango, Litchi"
                  value={fruitName}
                  onChange={(e) => setFruitName(e.target.value)}
                />
                
                {/* Fruit Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {fruitSuggestions
                    .filter((f) => f.toLowerCase().includes(fruitName.toLowerCase()) || fruitName === '')
                    .slice(0, 5)
                    .map((f) => (
                      <span
                        key={f}
                        onClick={() => setFruitName(f)}
                        className="cursor-pointer rounded-full border border-sand bg-cream hover:border-forest px-2.5 py-0.5 text-xs text-sub hover:text-forest transition-colors"
                      >
                        {f}
                      </span>
                    ))}
                </div>
              </div>

              {/* Month Selectors */}
              <div className="grid gap-4 grid-cols-2">
                <Select
                  label="Harvest Start Month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Harvest End Month"
                  value={endMonth}
                  onChange={(e) => setEndMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="rounded-xl bg-paper p-4 border border-sand/50 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-forest">
                  <Sparkles className="h-3.5 w-3.5" />
                  Peak Harvesting Period (Inside Harvest Window)
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <Select
                    label="Peak Start Month"
                    value={peakStartMonth}
                    onChange={(e) => setPeakStartMonth(Number(e.target.value))}
                  >
                    {MONTHS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName}
                      </option>
                    ))}
                  </Select>

                  <Select
                    label="Peak End Month"
                    value={peakEndMonth}
                    onChange={(e) => setPeakEndMonth(Number(e.target.value))}
                  >
                    {MONTHS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {validationError && (
                <div className="p-3 bg-terra/20 text-terra text-xs font-semibold rounded-xl border border-terra/30">
                  ⚠️ {validationError}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                {editingIndex !== null && (
                  <Button variant="outline" type="button" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" className="flex items-center gap-1.5">
                  {editingIndex !== null ? (
                    <>
                      <RefreshCw className="h-4 w-4" /> Update Season
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Add Season
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Current Seasons List */}
          <Card className="p-6 border border-sand">
            <h2 className="font-serif text-lg font-bold text-ink mb-4">
              📅 Mapped Seasons ({seasons.length})
            </h2>

            {seasons.length === 0 ? (
              <p className="text-sm text-faint">No fruit seasons mapped yet. Use the form above to add seasons.</p>
            ) : (
              <div className="divide-y divide-chip">
                {seasons.map((s, idx) => (
                  <div key={idx} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div>
                      <h4 className="font-bold text-ink text-sm flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-forest" />
                        {s.fruitName}
                      </h4>
                      <p className="text-xs text-sub mt-1">
                        Harvest: <b>{MONTHS[s.startMonth - 1].fullName}</b> to <b>{MONTHS[s.endMonth - 1].fullName}</b>
                      </p>
                      <p className="text-xs text-forest font-medium mt-0.5">
                        Peak Period: <b>{MONTHS[s.peakStartMonth - 1].fullName}</b> to <b>{MONTHS[s.peakEndMonth - 1].fullName}</b>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditClick(idx)}
                        className="p-2 rounded-lg border border-sand bg-cream hover:bg-chip text-sub hover:text-ink transition-colors"
                        title="Edit Season"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(idx)}
                        className="p-2 rounded-lg border border-sand bg-cream hover:bg-chip text-terra hover:bg-[#f3e7e1] transition-colors"
                        title="Delete Season"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Live Timeline Preview */}
        <div className="space-y-6 lg:sticky lg:top-[84px] self-start">
          <div className="p-4 rounded-xl bg-forest-light/30 border border-forest/20 text-xs font-semibold text-forest flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-forest flex-none animate-pulse" />
            <span>This is a live preview. Click <b>"Save Schedule"</b> above to apply changes.</span>
          </div>

          <HarvestTimeline harvestSeasons={seasons} title="Timeline Preview" />
        </div>
      </div>
    </div>
  );
}
