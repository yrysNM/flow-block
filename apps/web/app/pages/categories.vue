<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Categories and tags</h1>
      <p class="mt-1 text-sm text-secondary">These belong to your account. Assign them from a task after you create them here.</p>
    </div>

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>

    <section class="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 class="text-base font-semibold">Categories</h2>
      <form class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end" @submit.prevent="createCategory">
        <label class="block flex-1 text-sm font-medium">
          Name
          <input v-model="categoryName" required maxlength="60" class="field mt-1" />
        </label>
        <label class="block text-sm font-medium">
          Color
          <input v-model="categoryColor" placeholder="#3366FF" maxlength="7" class="field mt-1" />
        </label>
        <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white" :disabled="busy">Add category</button>
      </form>
      <p v-if="catalog.categories.length === 0" class="mt-4 text-sm text-secondary">No categories yet.</p>
      <ul v-else class="mt-4 divide-y divide-line">
        <li v-for="category in catalog.categories" :key="category.id" class="flex flex-col gap-2 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-2">
            <span class="size-3 shrink-0 rounded-full" :style="{ background: category.color || '#cbd5e1' }" />
            <template v-if="editingCategoryId === category.id">
              <input v-model="editName" maxlength="60" class="field" />
              <input v-model="editColor" maxlength="7" placeholder="#3366FF" class="field w-28" />
            </template>
            <span v-else class="truncate font-medium">{{ category.name }}</span>
          </div>
          <div class="flex gap-2">
            <template v-if="editingCategoryId === category.id">
              <button type="button" class="rounded-lg bg-primary px-3 py-1.5 text-sm text-white" @click="saveCategory(category.id)">Save</button>
              <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="editingCategoryId = ''">Cancel</button>
            </template>
            <template v-else>
              <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="startCategoryEdit(category)">Edit</button>
              <button type="button" class="rounded-lg border border-danger/30 px-3 py-1.5 text-sm text-danger" @click="confirmCategoryId = category.id">Delete</button>
            </template>
          </div>
          <p v-if="confirmCategoryId === category.id" class="text-sm text-secondary sm:basis-full">
            Delete this category? Tasks stay, without this category.
            <button type="button" class="ml-2 rounded-lg bg-danger px-2 py-1 text-white" @click="removeCategory(category.id)">Delete</button>
            <button type="button" class="ml-1 rounded-lg border border-line px-2 py-1" @click="confirmCategoryId = ''">Cancel</button>
          </p>
        </li>
      </ul>
    </section>

    <section class="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 class="text-base font-semibold">Tags</h2>
      <form class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end" @submit.prevent="createTag">
        <label class="block flex-1 text-sm font-medium">
          Name
          <input v-model="tagName" required maxlength="40" class="field mt-1" />
        </label>
        <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white" :disabled="busy">Add tag</button>
      </form>
      <p v-if="catalog.tags.length === 0" class="mt-4 text-sm text-secondary">No tags yet.</p>
      <ul v-else class="mt-4 divide-y divide-line">
        <li v-for="tag in catalog.tags" :key="tag.id" class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <template v-if="editingTagId === tag.id">
            <input v-model="editName" maxlength="40" class="field max-w-sm" />
          </template>
          <span v-else class="font-medium">{{ tag.name }}</span>
          <div class="flex gap-2">
            <template v-if="editingTagId === tag.id">
              <button type="button" class="rounded-lg bg-primary px-3 py-1.5 text-sm text-white" @click="saveTag(tag.id)">Save</button>
              <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="editingTagId = ''">Cancel</button>
            </template>
            <template v-else>
              <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="startTagEdit(tag)">Rename</button>
              <button type="button" class="rounded-lg border border-danger/30 px-3 py-1.5 text-sm text-danger" @click="confirmTagId = tag.id">Delete</button>
            </template>
          </div>
          <p v-if="confirmTagId === tag.id" class="text-sm text-secondary">
            Delete this tag? It will be removed from tasks.
            <button type="button" class="ml-2 rounded-lg bg-danger px-2 py-1 text-white" @click="removeTag(tag.id)">Delete</button>
            <button type="button" class="ml-1 rounded-lg border border-line px-2 py-1" @click="confirmTagId = ''">Cancel</button>
          </p>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CategoryView, TagView } from '@focusflow/shared-types'
import { apiErrorMessage } from '~/utils/api-error'

const catalog = useCatalogStore()
const error = ref('')
const busy = ref(false)
const categoryName = ref('')
const categoryColor = ref('')
const tagName = ref('')
const editingCategoryId = ref('')
const editingTagId = ref('')
const confirmCategoryId = ref('')
const confirmTagId = ref('')
const editName = ref('')
const editColor = ref('')

function colorOrNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

async function createCategory() {
  error.value = ''
  busy.value = true
  try {
    await catalog.createCategory({ name: categoryName.value.trim(), color: colorOrNull(categoryColor.value) })
    categoryName.value = ''
    categoryColor.value = ''
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not create the category.')
  } finally {
    busy.value = false
  }
}

function startCategoryEdit(category: CategoryView) {
  editingTagId.value = ''
  editingCategoryId.value = category.id
  editName.value = category.name
  editColor.value = category.color ?? ''
}

async function saveCategory(id: string) {
  error.value = ''
  try {
    await catalog.updateCategory(id, { name: editName.value.trim(), color: colorOrNull(editColor.value) })
    editingCategoryId.value = ''
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not update the category.')
  }
}

async function removeCategory(id: string) {
  error.value = ''
  try {
    await catalog.removeCategory(id)
    confirmCategoryId.value = ''
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not delete the category.')
  }
}

async function createTag() {
  error.value = ''
  busy.value = true
  try {
    await catalog.createTag({ name: tagName.value.trim() })
    tagName.value = ''
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not create the tag.')
  } finally {
    busy.value = false
  }
}

function startTagEdit(tag: TagView) {
  editingCategoryId.value = ''
  editingTagId.value = tag.id
  editName.value = tag.name
}

async function saveTag(id: string) {
  error.value = ''
  try {
    await catalog.updateTag(id, { name: editName.value.trim() })
    editingTagId.value = ''
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not rename the tag.')
  }
}

async function removeTag(id: string) {
  error.value = ''
  try {
    await catalog.removeTag(id)
    confirmTagId.value = ''
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not delete the tag.')
  }
}

onMounted(async () => {
  try {
    await Promise.all([catalog.fetchCategories(), catalog.fetchTags()])
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not load categories.')
  }
})
</script>

<style scoped>
.field {
  width: 100%;
  border-radius: 0.65rem;
  border: 1px solid var(--color-line);
  background: white;
  padding: 0.45rem 0.7rem;
  color: var(--color-ink);
}
</style>
