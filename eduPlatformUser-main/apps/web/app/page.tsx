import OfflineWrapper from "./components/common/OfflineWrapper";

export default function Page() {
  return (
    <div
      className="relative min-h-screen w-full bg-white dark:bg-[#0d0d1a]"
      style={{ overflow: 'visible' }}
    >
      <OfflineWrapper />
    </div>
  );
}
