import TelemetryViewer from '../components/TelemetryViewer';
import { listTelemetry } from '../queries';

export const metadata = {
  title: 'Telemetri & AI Export — Admin Nived',
};

export const instant = false;

export default async function AdminTelemetryPage() {
  const { taps, feedbacks } = await listTelemetry({ limit: 500 });

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
          AI Telemetri & Data Aggregation
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Dataset log tersanitasi (anonymized IP hash) untuk evaluasi performa, fine-tuning model AI, dan analisis konversi tap.
        </p>
      </div>

      <TelemetryViewer taps={taps} feedbacks={feedbacks} />
    </div>
  );
}
