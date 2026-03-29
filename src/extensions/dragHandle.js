import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const dragHandlePluginKey = new PluginKey('dragHandle')

// Top-level block node types that get drag handles
const BLOCK_TYPES = new Set([
  'paragraph', 'heading', 'bulletList', 'orderedList', 'taskList',
  'table', 'blockquote', 'codeBlock', 'collapsible', 'image',
  'youtube', 'horizontalRule', 'section',
])

function resolveTopLevelBlock(view, event) {
  const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
  if (!pos) return null
  const { doc } = view.state
  const resolved = doc.resolve(pos.pos)
  for (let d = resolved.depth; d >= 1; d--) {
    if (d === 1) {
      const node = resolved.node(d)
      const nodePos = resolved.before(d)
      return { node, pos: nodePos, depth: d }
    }
  }
  return null
}

function resolveTopLevelBlockFromSelection(state) {
  const { selection, doc } = state
  const resolved = doc.resolve(selection.from)
  for (let d = resolved.depth; d >= 1; d--) {
    if (d === 1) {
      const node = resolved.node(d)
      const nodePos = resolved.before(d)
      return { node, pos: nodePos, depth: d }
    }
  }
  return null
}

function getBlockDomNode(view, nodePos) {
  try {
    const domNode = view.nodeDOM(nodePos)
    if (domNode && domNode.nodeType === 1) return domNode
    if (domNode && domNode.nodeType === 3) return domNode.parentElement
  } catch {
    // nodeDOM can throw for some positions
  }
  return null
}

// ── Block Controls Bar (↑ ↓ ⋮⋮) ──

function createBlockControls() {
  const bar = document.createElement('div')
  bar.className = 'block-controls'
  bar.innerHTML = `
    <button class="block-controls__btn block-controls__up" title="Move up (Alt+↑)" aria-label="Move block up">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
    </button>
    <div class="block-controls__grip" draggable="true" data-drag-handle title="Drag to reorder / Click for menu" aria-label="Block menu and drag handle">
      <svg width="12" height="14" viewBox="0 0 12 16" fill="currentColor">
        <circle cx="3.5" cy="2.5" r="1.4"/><circle cx="8.5" cy="2.5" r="1.4"/>
        <circle cx="3.5" cy="7" r="1.4"/><circle cx="8.5" cy="7" r="1.4"/>
        <circle cx="3.5" cy="11.5" r="1.4"/><circle cx="8.5" cy="11.5" r="1.4"/>
      </svg>
    </div>
    <button class="block-controls__btn block-controls__down" title="Move down (Alt+↓)" aria-label="Move block down">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
  `
  return bar
}

// ── Hover grip (subtle grip on non-active hovered blocks) ──

function createHoverGrip() {
  const grip = document.createElement('div')
  grip.className = 'block-hover-grip'
  grip.setAttribute('draggable', 'true')
  grip.setAttribute('data-drag-handle', '')
  grip.innerHTML = `<svg width="12" height="14" viewBox="0 0 12 16" fill="currentColor">
    <circle cx="3.5" cy="2.5" r="1.4"/><circle cx="8.5" cy="2.5" r="1.4"/>
    <circle cx="3.5" cy="7" r="1.4"/><circle cx="8.5" cy="7" r="1.4"/>
    <circle cx="3.5" cy="11.5" r="1.4"/><circle cx="8.5" cy="11.5" r="1.4"/>
  </svg>`
  return grip
}

// ── Plus button between blocks ──

function createPlusButton() {
  const wrapper = document.createElement('div')
  wrapper.className = 'block-plus-wrapper'
  wrapper.innerHTML = `
    <div class="block-plus-line"></div>
    <button class="block-plus-btn" title="Add block" aria-label="Add new block">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  `
  return wrapper
}

function createDropIndicator() {
  const indicator = document.createElement('div')
  indicator.className = 'drag-drop-indicator'
  indicator.style.display = 'none'
  return indicator
}

function createBlockMenu(view, nodePos, anchorEl) {
  const existing = document.querySelector('.block-menu')
  if (existing) existing.remove()

  const menu = document.createElement('div')
  menu.className = 'block-menu'

  const { doc } = view.state
  const resolved = doc.resolve(nodePos)
  const nodeIndex = resolved.index(0)
  const parentChildCount = doc.content.childCount
  const node = doc.nodeAt(nodePos)
  if (!node) return null

  const items = [
    { label: 'Move Up', icon: '↑', disabled: nodeIndex === 0, action: () => moveBlock(view, nodePos, 'up') },
    { label: 'Move Down', icon: '↓', disabled: nodeIndex >= parentChildCount - 1, action: () => moveBlock(view, nodePos, 'down') },
    { label: 'Duplicate', icon: '⧉', action: () => duplicateBlock(view, nodePos) },
    { label: 'Delete', icon: '✕', danger: true, action: () => deleteBlock(view, nodePos) },
    { type: 'divider' },
    { type: 'submenu', label: 'Turn into', icon: '↻', items: [
      { label: 'Paragraph', action: () => turnInto(view, nodePos, 'paragraph') },
      { label: 'Heading 1', action: () => turnInto(view, nodePos, 'heading', { level: 1 }) },
      { label: 'Heading 2', action: () => turnInto(view, nodePos, 'heading', { level: 2 }) },
      { label: 'Heading 3', action: () => turnInto(view, nodePos, 'heading', { level: 3 }) },
      { label: 'Bullet List', action: () => turnIntoList(view, nodePos, 'bulletList') },
      { label: 'Ordered List', action: () => turnIntoList(view, nodePos, 'orderedList') },
      { label: 'Task List', action: () => turnIntoList(view, nodePos, 'taskList') },
      { label: 'Blockquote', action: () => turnInto(view, nodePos, 'blockquote') },
      { label: 'Code Block', action: () => turnInto(view, nodePos, 'codeBlock') },
    ]},
    { type: 'divider' },
    { label: 'Copy Block', icon: '📋', action: () => copyBlock(view, nodePos) },
  ]

  function renderItems(container, itemList) {
    for (const item of itemList) {
      if (item.type === 'divider') {
        const div = document.createElement('div')
        div.className = 'block-menu__divider'
        container.appendChild(div)
        continue
      }

      if (item.type === 'submenu') {
        const submenuLabel = document.createElement('div')
        submenuLabel.className = 'block-menu__item block-menu__submenu-trigger'
        submenuLabel.innerHTML = `<span class="block-menu__icon">${item.icon}</span><span>${item.label}</span><span class="block-menu__arrow">›</span>`
        container.appendChild(submenuLabel)

        const submenuContainer = document.createElement('div')
        submenuContainer.className = 'block-menu__submenu'
        submenuContainer.style.display = 'none'

        for (const sub of item.items) {
          const subEl = document.createElement('button')
          subEl.className = 'block-menu__item'
          subEl.innerHTML = `<span>${sub.label}</span>`
          subEl.addEventListener('click', (e) => {
            e.stopPropagation()
            sub.action()
            closeMenu()
          })
          submenuContainer.appendChild(subEl)
        }

        submenuLabel.addEventListener('click', (e) => {
          e.stopPropagation()
          const isVisible = submenuContainer.style.display !== 'none'
          submenuContainer.style.display = isVisible ? 'none' : 'block'
          submenuLabel.classList.toggle('block-menu__submenu-trigger--open', !isVisible)
        })

        container.appendChild(submenuContainer)
        continue
      }

      const btn = document.createElement('button')
      btn.className = 'block-menu__item'
      if (item.danger) btn.classList.add('block-menu__item--danger')
      if (item.disabled) {
        btn.classList.add('block-menu__item--disabled')
        btn.disabled = true
      }
      btn.innerHTML = `<span class="block-menu__icon">${item.icon}</span><span>${item.label}</span>`
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        item.action()
        closeMenu()
      })
      container.appendChild(btn)
    }
  }

  renderItems(menu, items)

  const anchorRect = anchorEl.getBoundingClientRect()
  menu.style.position = 'fixed'
  menu.style.top = `${anchorRect.bottom + 4}px`
  menu.style.left = `${anchorRect.left}px`
  menu.style.zIndex = '55'

  document.body.appendChild(menu)

  function closeMenu() {
    menu.remove()
    document.removeEventListener('mousedown', outsideClick)
    document.removeEventListener('keydown', escHandler)
  }

  function outsideClick(e) {
    if (!menu.contains(e.target)) closeMenu()
  }

  function escHandler(e) {
    if (e.key === 'Escape') closeMenu()
  }

  requestAnimationFrame(() => {
    document.addEventListener('mousedown', outsideClick)
    document.addEventListener('keydown', escHandler)
  })

  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect()
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${anchorRect.top - rect.height - 4}px`
    }
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 8}px`
    }
  })

  return menu
}

// ── Block operations ──

function moveBlock(view, nodePos, direction) {
  const { state } = view
  const { doc, tr } = state
  const resolved = doc.resolve(nodePos)
  const nodeIndex = resolved.index(0)
  const node = doc.nodeAt(nodePos)
  if (!node) return

  if (direction === 'up' && nodeIndex === 0) return
  if (direction === 'down' && nodeIndex >= doc.content.childCount - 1) return

  const nodeSize = node.nodeSize

  if (direction === 'up') {
    let prevPos = 0
    for (let i = 0; i < nodeIndex - 1; i++) {
      prevPos += doc.child(i).nodeSize
    }
    const transaction = tr
      .delete(nodePos, nodePos + nodeSize)
      .insert(prevPos, node)
    view.dispatch(transaction)
  } else {
    const nextNode = doc.child(nodeIndex + 1)
    const nextSize = nextNode.nodeSize
    const transaction = tr
      .delete(nodePos, nodePos + nodeSize)
      .insert(nodePos + nextSize - nodeSize, node)
    view.dispatch(transaction)
  }
}

function duplicateBlock(view, nodePos) {
  const { state } = view
  const node = state.doc.nodeAt(nodePos)
  if (!node) return
  const tr = state.tr.insert(nodePos + node.nodeSize, node.copy(node.content))
  view.dispatch(tr)
}

function deleteBlock(view, nodePos) {
  const { state } = view
  const node = state.doc.nodeAt(nodePos)
  if (!node) return
  const tr = state.tr.delete(nodePos, nodePos + node.nodeSize)
  view.dispatch(tr)
}

function turnInto(view, nodePos, typeName, attrs = {}) {
  const { state } = view
  const node = state.doc.nodeAt(nodePos)
  if (!node) return
  const schema = state.schema
  const newType = schema.nodes[typeName]
  if (!newType) return

  const textContent = node.textContent

  try {
    if (typeName === 'codeBlock') {
      const newNode = newType.create(attrs, textContent ? schema.text(textContent) : null)
      const tr = state.tr.replaceWith(nodePos, nodePos + node.nodeSize, newNode)
      view.dispatch(tr)
    } else if (typeName === 'blockquote') {
      const para = schema.nodes.paragraph.create(null, textContent ? schema.text(textContent) : null)
      const newNode = newType.create(attrs, para)
      const tr = state.tr.replaceWith(nodePos, nodePos + node.nodeSize, newNode)
      view.dispatch(tr)
    } else {
      const newNode = newType.create(attrs, textContent ? schema.text(textContent) : null)
      const tr = state.tr.replaceWith(nodePos, nodePos + node.nodeSize, newNode)
      view.dispatch(tr)
    }
  } catch {
    try {
      const tr = state.tr.setNodeMarkup(nodePos, newType, attrs)
      view.dispatch(tr)
    } catch {
      // Can't convert
    }
  }
}

function turnIntoList(view, nodePos, listType) {
  const { state } = view
  const node = state.doc.nodeAt(nodePos)
  if (!node) return
  const schema = state.schema
  const list = schema.nodes[listType]
  if (!list) return

  const textContent = node.textContent

  try {
    let listItemContent
    if (listType === 'taskList') {
      const para = schema.nodes.paragraph.create(null, textContent ? schema.text(textContent) : null)
      const taskItem = schema.nodes.taskItem.create({ checked: false }, para)
      listItemContent = taskItem
    } else {
      const para = schema.nodes.paragraph.create(null, textContent ? schema.text(textContent) : null)
      const listItem = schema.nodes.listItem.create(null, para)
      listItemContent = listItem
    }

    const newNode = list.create(null, listItemContent)
    const tr = state.tr.replaceWith(nodePos, nodePos + node.nodeSize, newNode)
    view.dispatch(tr)
  } catch {
    // Can't convert
  }
}

async function copyBlock(view, nodePos) {
  const node = view.state.doc.nodeAt(nodePos)
  if (!node) return
  const text = node.textContent
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

export const DragHandle = Extension.create({
  name: 'dragHandle',

  addKeyboardShortcuts() {
    return {
      'Alt-ArrowUp': ({ editor }) => {
        const { state } = editor
        const result = resolveTopLevelBlockFromSelection(state)
        if (!result) return false
        const nodeIndex = state.doc.resolve(result.pos).index(0)
        if (nodeIndex === 0) return false
        moveBlock(editor.view, result.pos, 'up')
        return true
      },
      'Alt-ArrowDown': ({ editor }) => {
        const { state } = editor
        const result = resolveTopLevelBlockFromSelection(state)
        if (!result) return false
        const nodeIndex = state.doc.resolve(result.pos).index(0)
        if (nodeIndex >= state.doc.content.childCount - 1) return false
        moveBlock(editor.view, result.pos, 'down')
        return true
      },
      'Mod-Shift-d': ({ editor }) => {
        const { state } = editor
        const result = resolveTopLevelBlockFromSelection(state)
        if (!result) return false
        duplicateBlock(editor.view, result.pos)
        return true
      },
      'Mod-Shift-Backspace': ({ editor }) => {
        const { state } = editor
        const result = resolveTopLevelBlockFromSelection(state)
        if (!result) return false
        deleteBlock(editor.view, result.pos)
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: dragHandlePluginKey,
        view(editorView) {
          // ── Create DOM elements ──
          const controls = createBlockControls()
          const hoverGrip = createHoverGrip()
          const plusBtn = createPlusButton()
          const dropIndicator = createDropIndicator()

          let activeBlockPos = null
          let activeBlockDOM = null
          let hoveredBlockPos = null
          let hoveredBlockDOM = null
          let isDragging = false
          let dragStartPos = null
          let menuOpen = false

          const editorWrapper = editorView.dom.closest('.tiptap-editor') || editorView.dom.parentElement
          if (editorWrapper) {
            editorWrapper.style.position = 'relative'
            editorWrapper.appendChild(controls)
            editorWrapper.appendChild(hoverGrip)
            editorWrapper.appendChild(plusBtn)
            editorWrapper.appendChild(dropIndicator)
          }

          controls.style.display = 'none'
          hoverGrip.style.display = 'none'
          plusBtn.style.display = 'none'

          const upBtn = controls.querySelector('.block-controls__up')
          const downBtn = controls.querySelector('.block-controls__down')
          const gripEl = controls.querySelector('.block-controls__grip')

          // ── Position helpers ──

          function positionControls(blockDOM) {
            if (!blockDOM || !editorWrapper) return
            const blockRect = blockDOM.getBoundingClientRect()
            const wrapperRect = editorWrapper.getBoundingClientRect()
            controls.style.display = 'flex'
            // Center vertically on the block, left gutter
            const controlsHeight = 76 // approx height of 3 stacked buttons
            const topOffset = blockRect.top - wrapperRect.top + Math.max(0, (blockRect.height - controlsHeight) / 2)
            controls.style.top = `${topOffset}px`
            controls.style.left = `${blockRect.left - wrapperRect.left - 34}px`
          }

          function positionHoverGrip(blockDOM) {
            if (!blockDOM || !editorWrapper) return
            const blockRect = blockDOM.getBoundingClientRect()
            const wrapperRect = editorWrapper.getBoundingClientRect()
            hoverGrip.style.display = 'flex'
            hoverGrip.style.top = `${blockRect.top - wrapperRect.top + 2}px`
            hoverGrip.style.left = `${blockRect.left - wrapperRect.left - 28}px`
          }

          function positionPlusButton(blockDOM) {
            if (!blockDOM || !editorWrapper) return
            const blockRect = blockDOM.getBoundingClientRect()
            const wrapperRect = editorWrapper.getBoundingClientRect()
            plusBtn.style.display = 'flex'
            plusBtn.style.top = `${blockRect.bottom - wrapperRect.top - 1}px`
            // Center the plus line across the block width
            plusBtn.style.left = `${blockRect.left - wrapperRect.left}px`
            plusBtn.style.width = `${blockRect.width}px`
          }

          function hideControls() {
            if (!menuOpen) {
              controls.style.display = 'none'
              activeBlockPos = null
              activeBlockDOM = null
            }
          }

          function hideHoverGrip() {
            if (!isDragging && !menuOpen) {
              hoverGrip.style.display = 'none'
              hoveredBlockPos = null
              hoveredBlockDOM = null
            }
          }

          function hidePlusButton() {
            plusBtn.style.display = 'none'
          }

          // ── Update active block from editor selection ──

          function updateActiveBlock() {
            const result = resolveTopLevelBlockFromSelection(editorView.state)
            if (!result) {
              hideControls()
              hidePlusButton()
              return
            }

            const blockDOM = getBlockDomNode(editorView, result.pos)
            if (!blockDOM) {
              hideControls()
              hidePlusButton()
              return
            }

            activeBlockPos = result.pos
            activeBlockDOM = blockDOM

            // Update button disabled states
            const nodeIndex = editorView.state.doc.resolve(result.pos).index(0)
            const childCount = editorView.state.doc.content.childCount
            upBtn.classList.toggle('block-controls__btn--disabled', nodeIndex === 0)
            downBtn.classList.toggle('block-controls__btn--disabled', nodeIndex >= childCount - 1)
            upBtn.disabled = nodeIndex === 0
            downBtn.disabled = nodeIndex >= childCount - 1

            positionControls(blockDOM)
            positionPlusButton(blockDOM)

            // Add active highlight class
            editorView.dom.querySelectorAll('.block-active').forEach(el => el.classList.remove('block-active'))
            blockDOM.classList.add('block-active')
          }

          // ── Mouse hover for non-active blocks ──

          function onMouseMove(event) {
            if (isDragging || menuOpen) return

            const result = resolveTopLevelBlock(editorView, event)
            if (!result) {
              hideHoverGrip()
              return
            }

            // Don't show hover grip on the active block (it has full controls)
            if (result.pos === activeBlockPos) {
              hideHoverGrip()
              return
            }

            const blockDOM = getBlockDomNode(editorView, result.pos)
            if (!blockDOM) {
              hideHoverGrip()
              return
            }

            hoveredBlockPos = result.pos
            hoveredBlockDOM = blockDOM
            positionHoverGrip(blockDOM)
          }

          function onMouseLeave(event) {
            const related = event.relatedTarget
            if (related && (hoverGrip.contains(related) || controls.contains(related) || plusBtn.contains(related))) return
            setTimeout(() => {
              if (!hoverGrip.matches(':hover') && !isDragging && !menuOpen) {
                hideHoverGrip()
              }
            }, 200)
          }

          // ── Up/Down button clicks ──

          upBtn.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            if (activeBlockPos !== null) {
              moveBlock(editorView, activeBlockPos, 'up')
              // Re-focus editor and update after move
              editorView.focus()
              requestAnimationFrame(() => updateActiveBlock())
            }
          })

          downBtn.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            if (activeBlockPos !== null) {
              moveBlock(editorView, activeBlockPos, 'down')
              editorView.focus()
              requestAnimationFrame(() => updateActiveBlock())
            }
          })

          // ── Grip click → block menu ──

          gripEl.addEventListener('mousedown', (e) => {
            e.preventDefault()
          })

          gripEl.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            if (activeBlockPos !== null && !isDragging) {
              menuOpen = true
              const menu = createBlockMenu(editorView, activeBlockPos, gripEl)
              if (menu) {
                const observer = new MutationObserver(() => {
                  if (!document.body.contains(menu)) {
                    menuOpen = false
                    observer.disconnect()
                    requestAnimationFrame(() => updateActiveBlock())
                  }
                })
                observer.observe(document.body, { childList: true, subtree: true })
              } else {
                menuOpen = false
              }
            }
          })

          // ── Hover grip click → block menu (for non-active blocks) ──

          hoverGrip.addEventListener('mousedown', (e) => {
            e.preventDefault()
          })

          hoverGrip.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            if (hoveredBlockPos !== null && !isDragging) {
              menuOpen = true
              const menu = createBlockMenu(editorView, hoveredBlockPos, hoverGrip)
              if (menu) {
                const observer = new MutationObserver(() => {
                  if (!document.body.contains(menu)) {
                    menuOpen = false
                    observer.disconnect()
                  }
                })
                observer.observe(document.body, { childList: true, subtree: true })
              } else {
                menuOpen = false
              }
            }
          })

          // ── Drag from grip (active controls) ──

          gripEl.addEventListener('dragstart', (e) => {
            if (activeBlockPos === null) { e.preventDefault(); return }
            isDragging = true
            dragStartPos = activeBlockPos
            gripEl.classList.add('block-controls__grip--dragging')
            if (activeBlockDOM) activeBlockDOM.classList.add('block-dragging')

            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', '')

            const ghost = document.createElement('div')
            ghost.style.opacity = '0'
            ghost.style.position = 'absolute'
            ghost.style.top = '-1000px'
            document.body.appendChild(ghost)
            e.dataTransfer.setDragImage(ghost, 0, 0)
            requestAnimationFrame(() => ghost.remove())
          })

          // ── Drag from hover grip ──

          hoverGrip.addEventListener('dragstart', (e) => {
            if (hoveredBlockPos === null) { e.preventDefault(); return }
            isDragging = true
            dragStartPos = hoveredBlockPos
            hoverGrip.classList.add('block-hover-grip--dragging')
            if (hoveredBlockDOM) hoveredBlockDOM.classList.add('block-dragging')

            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', '')

            const ghost = document.createElement('div')
            ghost.style.opacity = '0'
            ghost.style.position = 'absolute'
            ghost.style.top = '-1000px'
            document.body.appendChild(ghost)
            e.dataTransfer.setDragImage(ghost, 0, 0)
            requestAnimationFrame(() => ghost.remove())
          })

          // ── Drag over / drop ──

          function onDragOver(event) {
            if (!isDragging || dragStartPos === null) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'

            const result = resolveTopLevelBlock(editorView, event)
            if (!result || !editorWrapper) return

            const blockDOM = getBlockDomNode(editorView, result.pos)
            if (!blockDOM) return

            const blockRect = blockDOM.getBoundingClientRect()
            const wrapperRect = editorWrapper.getBoundingClientRect()
            const midY = blockRect.top + blockRect.height / 2

            dropIndicator.style.display = 'block'
            dropIndicator.style.left = `${blockRect.left - wrapperRect.left}px`
            dropIndicator.style.width = `${blockRect.width}px`

            if (event.clientY < midY) {
              dropIndicator.style.top = `${blockRect.top - wrapperRect.top - 1}px`
              dropIndicator.dataset.insertBefore = result.pos
            } else {
              const node = editorView.state.doc.nodeAt(result.pos)
              const afterPos = result.pos + (node ? node.nodeSize : 0)
              dropIndicator.style.top = `${blockRect.bottom - wrapperRect.top - 1}px`
              dropIndicator.dataset.insertBefore = afterPos
            }
          }

          function onDrop(event) {
            if (!isDragging || dragStartPos === null) return
            event.preventDefault()

            const insertPos = parseInt(dropIndicator.dataset.insertBefore, 10)
            if (!isNaN(insertPos)) {
              const { state } = editorView
              const node = state.doc.nodeAt(dragStartPos)
              if (node) {
                let tr = state.tr
                if (insertPos > dragStartPos) {
                  const adjustedInsert = insertPos - node.nodeSize
                  tr = tr.delete(dragStartPos, dragStartPos + node.nodeSize)
                  tr = tr.insert(Math.max(0, adjustedInsert), node)
                } else {
                  tr = tr.delete(dragStartPos, dragStartPos + node.nodeSize)
                  tr = tr.insert(insertPos, node)
                }
                editorView.dispatch(tr)
              }
            }

            cleanupDrag()
          }

          function onDragEnd() {
            cleanupDrag()
          }

          function cleanupDrag() {
            isDragging = false
            dragStartPos = null
            gripEl.classList.remove('block-controls__grip--dragging')
            hoverGrip.classList.remove('block-hover-grip--dragging')
            dropIndicator.style.display = 'none'
            document.querySelectorAll('.block-dragging').forEach(el => el.classList.remove('block-dragging'))
            requestAnimationFrame(() => updateActiveBlock())
          }

          // ── Plus button click ──

          const plusBtnEl = plusBtn.querySelector('.block-plus-btn')
          plusBtnEl.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            if (activeBlockPos === null) return
            const node = editorView.state.doc.nodeAt(activeBlockPos)
            if (!node) return
            const insertPos = activeBlockPos + node.nodeSize
            const newParagraph = editorView.state.schema.nodes.paragraph.create()
            const tr = editorView.state.tr.insert(insertPos, newParagraph)
            // Set cursor into the new paragraph
            const resolvedPos = tr.doc.resolve(insertPos + 1)
            tr.setSelection(editorView.state.selection.constructor.near(resolvedPos))
            editorView.dispatch(tr)
            editorView.focus()
          })

          // ── Attach listeners ──

          editorView.dom.addEventListener('mousemove', onMouseMove)
          editorView.dom.addEventListener('mouseleave', onMouseLeave)
          editorView.dom.addEventListener('dragover', onDragOver)
          editorView.dom.addEventListener('drop', onDrop)
          gripEl.addEventListener('dragend', onDragEnd)
          hoverGrip.addEventListener('dragend', onDragEnd)

          // Hide hover grip when leaving
          hoverGrip.addEventListener('mouseleave', (e) => {
            const related = e.relatedTarget
            if (related && editorView.dom.contains(related)) return
            setTimeout(() => {
              if (!editorView.dom.matches(':hover') && !isDragging && !menuOpen) {
                hideHoverGrip()
              }
            }, 200)
          })

          // Prevent controls from stealing editor focus
          controls.addEventListener('mousedown', (e) => {
            // Allow the grip to be draggable but prevent others from stealing focus
            if (!gripEl.contains(e.target)) {
              e.preventDefault()
            }
          })

          return {
            update(view, prevState) {
              // Update on selection change
              if (!prevState || !view.state.selection.eq(prevState.selection) || !view.state.doc.eq(prevState.doc)) {
                requestAnimationFrame(() => updateActiveBlock())
              }
              // Also update controls position on doc changes (scroll etc)
              if (activeBlockDOM && !isDragging) {
                positionControls(activeBlockDOM)
                positionPlusButton(activeBlockDOM)
              }
            },
            destroy() {
              controls.remove()
              hoverGrip.remove()
              plusBtn.remove()
              dropIndicator.remove()
              editorView.dom.removeEventListener('mousemove', onMouseMove)
              editorView.dom.removeEventListener('mouseleave', onMouseLeave)
              editorView.dom.removeEventListener('dragover', onDragOver)
              editorView.dom.removeEventListener('drop', onDrop)
              editorView.dom.querySelectorAll('.block-active').forEach(el => el.classList.remove('block-active'))
              document.querySelectorAll('.block-menu').forEach(el => el.remove())
            },
          }
        },
      }),
    ]
  },
})

export default DragHandle
