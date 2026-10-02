<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import * as z from 'zod'
import { WrongKeyError } from '#shared/domain/crypto'

definePageMeta({ layout: false })
useSeoMeta({ title: 'Entrar · ENSPACE Releases' })

const route = useRoute()
const { unlock } = usePanelKey()
const { fetchFile } = useReleases()

const fields: AuthFormField[] = [{
  name: 'password',
  type: 'password',
  label: 'Senha',
  placeholder: 'Senha compartilhada pelo time de Produto',
  required: true
}, {
  name: 'remember',
  type: 'checkbox',
  label: 'Lembrar neste dispositivo',
  description: 'Desmarque em computadores compartilhados.',
  defaultValue: true
}]

const schema = z.object({
  password: z.string('Informe a senha').min(1, 'Informe a senha'),
  remember: z.boolean().optional()
})

const loading = ref(false)
const errorMessage = ref<string | null>(
  route.query.motivo === 'senha' ? 'A senha do painel mudou. Entre com a nova senha.' : null
)

async function onSubmit(event: FormSubmitEvent<z.output<typeof schema>>) {
  loading.value = true
  errorMessage.value = null
  try {
    const file = await fetchFile()
    await unlock(event.data.password, file, event.data.remember ?? true)
    await navigateTo(safeNext(route.query.next))
  } catch (err) {
    errorMessage.value = err instanceof WrongKeyError
      ? 'Senha incorreta. Tente de novo.'
      : 'Não foi possível carregar o painel agora. Tente de novo em instantes.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center p-4 bg-elevated/25">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="schema"
        :fields="fields"
        :loading="loading"
        :submit="{ label: 'Entrar', block: true }"
        icon="i-lucide-lock-keyhole"
        title="ENSPACE Releases"
        description="Status das próximas releases. Acesso restrito às equipes da ENSPACE."
        @submit="onSubmit"
      >
        <template #validation>
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errorMessage"
          />
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
