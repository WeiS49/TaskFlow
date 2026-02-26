export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
        Project {id}
      </h1>
    </div>
  );
}
