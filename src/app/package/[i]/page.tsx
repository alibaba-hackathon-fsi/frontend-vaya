import PackageDetail from "@/components/PackageDetail";

export default function PackagePage({ params }: { params: { i: string } }) {
  const idx = parseInt(params.i, 10);
  return <PackageDetail idx={Number.isNaN(idx) ? 0 : idx} />;
}
