import OtherAssets from '@/components/OtherAssets';

export default function AssetsPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">기타 자산</h1>
        <p className="text-sm text-slate-500 mt-0.5">실물 자산 · 전세 보증금 · 기타</p>
      </div>
      <OtherAssets />
    </div>
  );
}
