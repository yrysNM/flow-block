<template>
  <div class="matrix-card">
    <p class="axis-label axis-across hidden md:block">High priority</p>
    <div class="matrix-body">
      <div class="axis-rail hidden md:flex" aria-hidden="true">
        <span class="axis-vertical axis-up">Low effort</span>
      </div>
      <div class="quadrant-grid">
        <section
          v-for="group in groups"
          :key="group.quadrant.id"
          class="quadrant"
          :class="{ 'is-over': over === group.quadrant.id }"
          :style="{ background: group.quadrant.background }"
          :aria-label="`${group.quadrant.title}. ${group.quadrant.subtitle}. ${group.tasks.length} tasks`"
          @dragover="onDragOver(group.quadrant.id, $event)"
          @dragleave="onDragLeave(group.quadrant.id, $event)"
          @drop="onDrop(group.quadrant.id, $event)"
        >
          <header class="quadrant-head">
            <div class="flex items-center gap-2">
              <h2 class="text-[13px] font-bold uppercase tracking-[0.08em]" :style="{ color: group.quadrant.accent }">
                {{ group.quadrant.title }}
              </h2>
              <span
                class="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-white/80 px-1.5 text-[11px] font-semibold"
                :style="{ color: group.quadrant.accent }"
              >
                {{ group.tasks.length }}
              </span>
            </div>
            <p class="mt-0.5 text-[12px] font-medium" :style="{ color: group.quadrant.accent }">
              {{ group.quadrant.subtitle }}
            </p>
          </header>

          <button
            v-for="item in group.placed"
            :key="item.kind === 'task' ? item.task.id : `${group.quadrant.id}-more`"
            type="button"
            class="bubble"
            :class="{ 'is-dragging': item.kind === 'task' && draggingId === item.task.id }"
            :draggable="item.kind === 'task'"
            :title="item.kind === 'task' ? item.task.title : `${item.tasks.length} more tasks`"
            :aria-label="bubbleLabel(item, group.quadrant.title)"
            :style="bubbleStyle(item)"
            @dragstart="item.kind === 'task' ? onDragStart(item.task.id, $event) : undefined"
            @dragend="onDragEnd"
            @click="onBubbleClick(item)"
          >
            {{ item.kind === 'task' ? item.initials : item.label }}
          </button>
        </section>
      </div>
      <div class="axis-rail hidden md:flex" aria-hidden="true">
        <span class="axis-vertical">High effort</span>
      </div>
    </div>
    <p class="axis-label axis-across axis-bottom hidden md:block">Low priority</p>
  </div>
</template>

<script setup lang="ts">
import type { EisenhowerQuadrant, TaskView } from '@focusflow/shared-types'
import {
  placeBubbles,
  quadrantOf,
  QUADRANTS,
  type PlacedBubble,
} from '~/utils/eisenhower-board'

const props = defineProps<{
  tasks: TaskView[]
}>()

const emit = defineEmits<{
  select: [task: TaskView]
  overflow: [tasks: TaskView[]]
  move: [id: string, quadrant: EisenhowerQuadrant]
}>()

const groups = computed(() =>
  QUADRANTS.map((quadrant) => {
    const tasks = props.tasks.filter((task) => quadrantOf(task) === quadrant.id)
    return { quadrant, tasks, placed: placeBubbles(tasks) }
  }),
)

const over = ref<EisenhowerQuadrant | null>(null)
const draggingId = ref('')
const suppressClick = ref(false)

function bubbleStyle(item: PlacedBubble) {
  return {
    left: `${item.x}%`,
    top: `${item.y}%`,
    '--bubble': item.color,
  }
}

function bubbleLabel(item: PlacedBubble, quadrantTitle: string) {
  if (item.kind === 'overflow') return `${item.tasks.length} more tasks in ${quadrantTitle}`
  return `${item.task.title}. ${quadrantTitle}. Drag to another quadrant, or activate for details.`
}

function onDragStart(id: string, event: DragEvent) {
  draggingId.value = id
  suppressClick.value = true
  event.dataTransfer?.setData('application/x-focusflow-task', id)
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  draggingId.value = ''
  over.value = null
  window.setTimeout(() => {
    suppressClick.value = false
  }, 0)
}

function onDragOver(quadrant: EisenhowerQuadrant, event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  over.value = quadrant
}

function onDragLeave(quadrant: EisenhowerQuadrant, event: DragEvent) {
  const next = event.relatedTarget
  if (next instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(next)) return
  if (over.value === quadrant) over.value = null
}

function onDrop(quadrant: EisenhowerQuadrant, event: DragEvent) {
  event.preventDefault()
  over.value = null
  const id = event.dataTransfer?.getData('application/x-focusflow-task') || event.dataTransfer?.getData('text/plain') || ''
  draggingId.value = ''
  if (!id) return
  emit('move', id, quadrant)
}

function onBubbleClick(item: PlacedBubble) {
  if (suppressClick.value) return
  if (item.kind === 'overflow') emit('overflow', item.tasks)
  else emit('select', item.task)
}
</script>

<style scoped>
.matrix-card {
  border: 1px solid #e6ebf3;
  border-radius: 24px;
  background: #fff;
  padding: 10px 12px 12px;
  box-shadow:
    0 1px 2px rgb(23 32 51 / 0.04),
    0 12px 32px rgb(23 32 51 / 0.05);
}

.axis-label {
  margin: 0;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-align: center;
  text-transform: uppercase;
}

.axis-across {
  padding: 2px 0 8px;
}

.axis-bottom {
  padding: 8px 0 2px;
}

.matrix-body {
  display: flex;
  align-items: stretch;
  gap: 4px;
}

.axis-rail {
  width: 1.35rem;
  flex: none;
  align-items: center;
  justify-content: center;
}

.axis-vertical {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  writing-mode: vertical-rl;
}

.axis-up {
  transform: rotate(180deg);
}

.quadrant-grid {
  display: grid;
  flex: 1;
  min-width: 0;
  grid-template-columns: 1fr;
  gap: 3px;
  overflow: hidden;
  border-radius: 18px;
  background: #fff;
}

.quadrant {
  position: relative;
  min-height: 220px;
}

.quadrant.is-over {
  box-shadow: inset 0 0 0 2px rgb(0 85 250 / 0.45);
}

.quadrant-head {
  position: relative;
  z-index: 2;
  padding: 14px 16px 0;
  pointer-events: none;
}

.bubble {
  position: absolute;
  z-index: 1;
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: var(--bubble);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  transform: translate(-50%, -50%);
  cursor: grab;
  box-shadow:
    0 0 0 3px #fff,
    0 0 0 5px color-mix(in srgb, var(--bubble) 78%, #172033),
    0 8px 16px rgb(23 32 51 / 0.16);
}

.bubble:hover {
  transform: translate(-50%, -50%) scale(1.05);
}

.bubble:active {
  cursor: grabbing;
}

.bubble.is-dragging {
  opacity: 0.45;
}

@media (min-width: 768px) {
  .quadrant-grid {
    height: 560px;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .quadrant {
    min-height: 0;
  }
}
</style>
