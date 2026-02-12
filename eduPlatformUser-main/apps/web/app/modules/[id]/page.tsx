"use client";

import { useParams } from "next/navigation";
import Main from "../../components/modules/Main";

export default function ModulePage() {
  const params = useParams();
  const submoduleId = Number(params.id);

  return <Main submoduleId={submoduleId} />;
}
