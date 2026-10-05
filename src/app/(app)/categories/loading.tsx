import { ListSkeleton } from "@/components/skeletons";

export default function Loading() {
  return <ListSkeleton rows={5} className="max-w-3xl" />;
}
