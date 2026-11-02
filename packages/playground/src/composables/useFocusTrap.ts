import { onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * 把 Tab 焦点限制在容器内。`active` 变为 false 时解除。
 */
export const useFocusTrap = (container: Ref<HTMLElement | null>, active: Ref<boolean>) => {
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !container.value) return

    const nodes = Array.from(container.value.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null
    )
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (!first || !last) return

    const current = document.activeElement
    if (event.shiftKey && (current === first || !container.value.contains(current))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const bind = () => {
    document.addEventListener('keydown', onKeydown, true)
  }

  const unbind = () => {
    document.removeEventListener('keydown', onKeydown, true)
  }

  watch(active, (value) => (value ? bind() : unbind()), { immediate: true })
  onBeforeUnmount(unbind)
}
