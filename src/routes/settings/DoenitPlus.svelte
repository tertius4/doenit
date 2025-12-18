<script>
  import { t } from "$lib/services/language.svelte";
</script>

<a
  href="/plus"
  class="bg-surface rounded-lg items-center p-4 flex justify-between relative gap-4 w-full transition-colors cursor-pointer"
>
  <div class="flex flex-col gap-2 w-full">
    <h3 class="text-lg font-semibold">Doenit Plus</h3>
  </div>

  <div class="text-primary font-medium">{t("manage")}</div>
</a>
