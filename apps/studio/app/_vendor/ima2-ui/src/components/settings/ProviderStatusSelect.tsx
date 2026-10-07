import { useProviderAvailability } from "../../hooks/useProviderAvailability";
import type { McpProviderRecord } from "../../lib/mcpProviders";
import { useI18n } from "../../i18n";

// The service manages the media provider; expose readiness without a selector.
export function ProviderStatusSelect(_props: { mcpProviders: McpProviderRecord[] }) {
  const { t } = useI18n();
  const availability = useProviderAvailability();
  const ready = availability.grok.ok;
  return <div className="option-group provider-status-select">
    <div className="section-title">AI 서비스 연결</div>
    <div className="provider-status-line" data-tone={ready ? "ok" : "warn"} role="status" aria-live="polite">
      <span className={`status-dot status-dot--${ready ? "ok" : "warn"}`} aria-hidden="true" />
      <span className="provider-status-line__value">{ready ? t("provider.statusReady") : "서버의 AI 연결을 확인하고 있습니다."}</span>
    </div>
  </div>;
}
