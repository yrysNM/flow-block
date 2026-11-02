import type { CreateCategoryInput, CreateTagInput, UpdateCategoryInput, UpdateTagInput } from '@focusflow/shared-schemas'
import type { CategoryView, TagView } from '@focusflow/shared-types'
import { defineStore } from 'pinia'

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    categories: [] as CategoryView[],
    tags: [] as TagView[],
  }),
  actions: {
    async fetchCategories() {
      const api = useApi()
      this.categories = await api<CategoryView[]>('/categories')
    },
    async fetchTags() {
      const api = useApi()
      this.tags = await api<TagView[]>('/tags')
    },
    async createCategory(input: CreateCategoryInput) {
      const api = useApi()
      const created = await api<CategoryView>('/categories', { method: 'POST', body: input })
      await this.fetchCategories()
      return created
    },
    async updateCategory(id: string, input: UpdateCategoryInput) {
      const api = useApi()
      const updated = await api<CategoryView>(`/categories/${id}`, { method: 'PATCH', body: input })
      await this.fetchCategories()
      return updated
    },
    async removeCategory(id: string) {
      const api = useApi()
      await api(`/categories/${id}`, { method: 'DELETE' })
      await this.fetchCategories()
    },
    async createTag(input: CreateTagInput) {
      const api = useApi()
      const created = await api<TagView>('/tags', { method: 'POST', body: input })
      await this.fetchTags()
      return created
    },
    async updateTag(id: string, input: UpdateTagInput) {
      const api = useApi()
      const updated = await api<TagView>(`/tags/${id}`, { method: 'PATCH', body: input })
      await this.fetchTags()
      return updated
    },
    async removeTag(id: string) {
      const api = useApi()
      await api(`/tags/${id}`, { method: 'DELETE' })
      await this.fetchTags()
    },
  },
})
