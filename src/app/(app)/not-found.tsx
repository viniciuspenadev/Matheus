import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <EmptyState
      title="Página não encontrada"
      description="O item pode ter sido excluído ou o endereço está incorreto."
      action={<LinkButton href="/">Voltar ao início</LinkButton>}
    />
  );
}
