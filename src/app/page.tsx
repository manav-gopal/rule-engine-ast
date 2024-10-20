import { HydrateClient } from "@/trpc/server";
import RuleForm from '@/components/RuleForm';

export default async function Home() {

  return (
    <HydrateClient>
      <main>
        <RuleForm />
      </main>
    </HydrateClient>
  );
}
