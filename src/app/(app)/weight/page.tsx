import { redirect } from "next/navigation";

export default function WeightPage() {
  redirect("/trends?tab=weight");
}
