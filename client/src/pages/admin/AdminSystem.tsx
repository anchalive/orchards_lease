import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { adminService, type PlatformSettings, type AuditLog } from '@/services/admin.service';
import { Toggle } from '@/components/ui/Toggle';
import { Spinner } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { timeAgo } from '@/lib/format';
import { getErrorMessage } from '@/lib/apiClient';

export default function AdminSystem() {
  const toast = useToast();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  // illustrative-only toggles (no backend field yet)
  const [local, setLocal] = useState({ requireKyc: true, guestBrowse: true });

  useEffect(() => {
    Promise.all([adminService.getSettings(), adminService.auditLogs()])
      .then(([s, l]) => {
        setSettings(s);
        setLogs(l);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const patch = async (p: Partial<PlatformSettings>, msg: string) => {
    if (!settings) return;
    const prev = settings;
    setSettings({ ...settings, ...p });
    try {
      const updated = await adminService.updateSettings(p);
      setSettings(updated);
      toast.success(msg);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSettings(prev);
    }
  };

  if (loading || !settings)
    return (
      <main className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </main>
    );

  return (
    <main className="mx-auto max-w-[1240px] px-6 pb-16 pt-6">
      <div className="mb-[18px]">
        <h1 className="font-serif text-[27px] font-semibold">System settings</h1>
        <p className="mt-1 text-[13.5px] text-faint">Platform configuration, announcements and audit trail</p>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-[300px] flex-1 basis-[360px] flex-col gap-[18px]">
          {/* Maintenance */}
          <section className="rounded-[18px] border border-sand bg-cream p-[22px]">
            <div className="flex items-center justify-between gap-3.5">
              <div>
                <h2 className="font-serif text-[18px] font-semibold">Maintenance mode</h2>
                <p className="mt-1 text-[13px] text-faint">Take the marketplace offline for updates</p>
              </div>
              <Toggle
                on={settings.maintenanceMode}
                onClick={() => patch({ maintenanceMode: !settings.maintenanceMode }, 'Maintenance mode updated')}
              />
            </div>
            {settings.maintenanceMode && (
              <div className="mt-3.5 rounded-[10px] bg-[#f3e7e1] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#a05a45]">
                Marketplace is currently in maintenance mode — only admins can sign in.
              </div>
            )}
          </section>

          {/* Announcement */}
          <section className="rounded-[18px] border border-sand bg-cream p-[22px]">
            <div className="mb-3.5 flex items-center justify-between gap-3.5">
              <div>
                <h2 className="font-serif text-[18px] font-semibold">Announcement banner</h2>
                <p className="mt-1 text-[13px] text-faint">Shown across the platform when enabled</p>
              </div>
              <Toggle
                on={settings.announcement.enabled}
                onClick={() =>
                  patch(
                    { announcement: { ...settings.announcement, enabled: !settings.announcement.enabled } },
                    'Announcement updated'
                  )
                }
              />
            </div>
            <input
              value={settings.announcement.message}
              onChange={(e) =>
                setSettings({ ...settings, announcement: { ...settings.announcement, message: e.target.value } })
              }
              onBlur={() => patch({ announcement: settings.announcement }, 'Announcement saved')}
              className="w-full rounded-[11px] border border-sand bg-white px-3.5 py-3 text-sm text-ink outline-none"
              placeholder="Announcement text…"
            />
            {settings.announcement.enabled && settings.announcement.message && (
              <div className="mt-3 rounded-[10px] bg-ink px-3.5 py-2.5 text-center text-[13px] font-semibold text-[#f4f0e3]">
                {settings.announcement.message}
              </div>
            )}
          </section>

          {/* Global settings */}
          <section className="rounded-[18px] border border-sand bg-cream p-[22px]">
            <h2 className="mb-1.5 font-serif text-[18px] font-semibold">Global settings</h2>
            <div className="flex flex-col">
              <Row
                title="Auto-approve listings"
                desc="Publish new orchards without manual review"
                on={settings.autoApproveOrchards}
                onClick={() =>
                  patch({ autoApproveOrchards: !settings.autoApproveOrchards }, 'Setting updated')
                }
              />
              <Row
                title="Require KYC for sellers"
                desc="Aadhaar & PAN verification before listing"
                on={local.requireKyc}
                onClick={() => setLocal((l) => ({ ...l, requireKyc: !l.requireKyc }))}
              />
              <Row
                title="Allow guest browsing"
                desc="Let signed-out visitors explore listings"
                on={local.guestBrowse}
                onClick={() => setLocal((l) => ({ ...l, guestBrowse: !l.guestBrowse }))}
              />
              <div className="border-t border-chip py-[13px]">
                <div className="text-sm font-semibold">Advance payment</div>
                <div className="mt-1 text-[12.5px] text-faint">Required before a seller can activate a lease</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-sub">
                    Advance percentage
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={settings.advancePaymentPercent}
                      onChange={(e) => setSettings({ ...settings, advancePaymentPercent: Number(e.target.value) })}
                      onBlur={() => patch({ advancePaymentPercent: settings.advancePaymentPercent }, 'Advance rule updated')}
                      className="mt-1 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink outline-none"
                    />
                  </label>
                  <label className="text-xs font-semibold text-sub">
                    Balance due days before start
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={settings.balanceDueDaysBeforeLease}
                      onChange={(e) => setSettings({ ...settings, balanceDueDaysBeforeLease: Number(e.target.value) })}
                      onBlur={() => patch({ balanceDueDaysBeforeLease: settings.balanceDueDaysBeforeLease }, 'Due-date rule updated')}
                      className="mt-1 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink outline-none"
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Audit log */}
        <section className="min-w-[300px] flex-1 basis-[320px] rounded-[18px] border border-sand bg-cream p-[22px]">
          <h2 className="mb-4 font-serif text-[18px] font-semibold">Audit log</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-faint">No audit entries yet.</p>
          ) : (
            <div className="flex flex-col">
              {logs.slice(0, 8).map((l) => (
                <div key={l._id} className="flex gap-3 pb-4">
                  <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-avail">
                    <Clock className="h-3.5 w-3.5 text-forest" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold leading-snug">
                      <b>{l.action}</b>
                      {l.description ? ` · ${l.description}` : ''}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-faint">
                      {l.actorLabel || l.actor?.email || 'system'} · {timeAgo(l.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Row({ title, desc, on, onClick }: { title: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3.5 border-t border-chip py-[13px]">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[12.5px] text-faint">{desc}</div>
      </div>
      <Toggle on={on} onClick={onClick} />
    </div>
  );
}
