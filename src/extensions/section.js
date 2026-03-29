import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Section Node Extension for Obscribe
 * 
 * A wrapping block node that groups content into named, collapsible sections.
 * Each section has a title, collapse/expand toggle, move controls, and a menu.
 */

// ── Section menu ──

function createSectionMenu(editor, getPos, node, anchorEl) {
  const existing = document.querySelector('.section-menu')
  if (existing) existing.remove()

  const menu = document.createElement('div')
  menu.className = 'section-menu'

  const colors = [
    { name: 'Teal', color: '#5b9a8b' },
    { name: 'Blue', color: '#3b82f6' },
    { name: 'Purple', color: '#a855f7' },
    { name: 'Pink', color: '#ec4899' },
    { name: 'Orange', color: '#f97316' },
    { name: 'Red', color: '#ef4444' },
    { name: 'Green', color: '#22c55e' },
    { name: 'Gray', color: '#6b7280' },
  ]

  const hasContent = node.content.size > 2 // more than just an empty paragraph

  const items = [
    {
      label: 'Rename',
      icon: '✏️',
      action: () => {
        // Focus the title input
        const pos = getPos()
        const sectionDOM = editor.view.nodeDOM(pos)
        if (sectionDOM) {
          const titleInput = sectionDOM.querySelector('.editor-section__title')
          if (titleInput) {
            titleInput.focus()
            titleInput.select()
          }
        }
      },
    },
    {
      label: 'Duplicate',
      icon: '⧉',
      action: () => {
        const pos = getPos()
        const sectionNode = editor.state.doc.nodeAt(pos)
        if (!sectionNode) return
        const tr = editor.state.tr.insert(pos + sectionNode.nodeSize, sectionNode.copy(sectionNode.content))
        editor.view.dispatch(tr)
      },
    },
    {
      label: 'Delete',
      icon: '✕',
      danger: true,
      action: () => {
        if (hasContent) {
          if (!confirm('Delete this section and all its content?')) return
        }
        const pos = getPos()
        const sectionNode = editor.state.doc.nodeAt(pos)
        if (!sectionNode) return
        const tr = editor.state.tr.delete(pos, pos + sectionNode.nodeSize)
        editor.view.dispatch(tr)
        editor.commands.focus()
      },
    },
    { type: 'divider' },
    {
      type: 'colors',
      label: 'Accent Color',
      colors,
      action: (color) => {
        const pos = getPos()
        const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          color,
        })
        editor.view.dispatch(tr)
      },
    },
  ]

  for (const item of items) {
    if (item.type === 'divider') {
      const div = document.createElement('div')
      div.className = 'section-menu__divider'
      menu.appendChild(div)
      continue
    }

    if (item.type === 'colors') {
      const label = document.createElement('div')
      label.className = 'section-menu__label'
      label.textContent = item.label
      menu.appendChild(label)

      const colorRow = document.createElement('div')
      colorRow.className = 'section-menu__colors'
      for (const c of item.colors) {
        const btn = document.createElement('button')
        btn.className = 'section-menu__color-btn'
        btn.style.background = c.color
        btn.title = c.name
        if (node.attrs.color === c.color) btn.classList.add('section-menu__color-btn--active')
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          item.action(c.color)
          closeMenu()
        })
        colorRow.appendChild(btn)
      }
      menu.appendChild(colorRow)
      continue
    }

    const btn = document.createElement('button')
    btn.className = 'section-menu__item'
    if (item.danger) btn.classList.add('section-menu__item--danger')
    btn.innerHTML = `<span class="section-menu__icon">${item.icon}</span><span>${item.label}</span>`
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      item.action()
      closeMenu()
    })
    menu.appendChild(btn)
  }

  // Position
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

    // Adjust if off-screen
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

// ── Move section helpers ──

function moveSectionUp(editor, getPos) {
  const pos = getPos()
  const { doc, tr } = editor.state
  const resolved = doc.resolve(pos)
  const nodeIndex = resolved.index(resolved.depth - 1)
  if (nodeIndex === 0) return

  const node = doc.nodeAt(pos)
  if (!node) return
  const nodeSize = node.nodeSize

  // Find the position of the previous sibling
  let prevPos = 0
  const parent = resolved.node(resolved.depth - 1)
  for (let i = 0; i < nodeIndex - 1; i++) {
    prevPos += parent.child(i).nodeSize
  }
  // Adjust prevPos relative to parent start
  const parentStart = resolved.start(resolved.depth - 1)
  prevPos += parentStart

  const transaction = tr
    .delete(pos, pos + nodeSize)
    .insert(prevPos, node)
  editor.view.dispatch(transaction)
}

function moveSectionDown(editor, getPos) {
  const pos = getPos()
  const { doc, tr } = editor.state
  const resolved = doc.resolve(pos)
  const parentDepth = resolved.depth - 1
  const nodeIndex = resolved.index(parentDepth)
  const parent = resolved.node(parentDepth)
  if (nodeIndex >= parent.childCount - 1) return

  const node = doc.nodeAt(pos)
  if (!node) return
  const nodeSize = node.nodeSize
  const nextNode = parent.child(nodeIndex + 1)
  const nextSize = nextNode.nodeSize

  const transaction = tr
    .delete(pos, pos + nodeSize)
    .insert(pos + nextSize - nodeSize, node)
  editor.view.dispatch(transaction)
}

// ── Section Node ──

export const Section = Node.create({
  name: 'section',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: false,

  addAttributes() {
    return {
      title: {
        default: 'Untitled Section',
        parseHTML: (el) => el.getAttribute('data-title') || 'Untitled Section',
        renderHTML: (attrs) => ({ 'data-title': attrs.title }),
      },
      collapsed: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-collapsed') === 'true',
        renderHTML: (attrs) => ({ 'data-collapsed': attrs.collapsed ? 'true' : 'false' }),
      },
      color: {
        default: '#5b9a8b',
        parseHTML: (el) => el.getAttribute('data-color') || '#5b9a8b',
        renderHTML: (attrs) => ({ 'data-color': attrs.color }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-section]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-section': '', class: 'editor-section' }), 0]
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      // ── DOM structure ──
      const dom = document.createElement('div')
      dom.classList.add('editor-section')
      dom.setAttribute('data-section', '')
      dom.style.setProperty('--section-accent', node.attrs.color)

      // Header (not editable by ProseMirror)
      const header = document.createElement('div')
      header.classList.add('editor-section__header')
      header.contentEditable = 'false'

      // Collapse button
      const collapseBtn = document.createElement('button')
      collapseBtn.classList.add('editor-section__collapse')
      collapseBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
      collapseBtn.title = 'Collapse/Expand'
      if (node.attrs.collapsed) {
        dom.classList.add('editor-section--collapsed')
      }

      // Title
      const titleInput = document.createElement('input')
      titleInput.classList.add('editor-section__title')
      titleInput.type = 'text'
      titleInput.value = node.attrs.title
      titleInput.placeholder = 'Untitled Section'
      titleInput.addEventListener('input', () => {
        const pos = getPos()
        if (pos === undefined) return
        const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          title: titleInput.value || 'Untitled Section',
          collapsed: dom.classList.contains('editor-section--collapsed'),
          color: dom.style.getPropertyValue('--section-accent'),
        })
        editor.view.dispatch(tr)
      })
      titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          // Focus into the section content
          const pos = getPos()
          const sectionNode = editor.state.doc.nodeAt(pos)
          if (sectionNode) {
            editor.commands.focus(pos + 1)
          }
        }
      })

      // Controls
      const controls = document.createElement('div')
      controls.classList.add('editor-section__controls')

      // Move Up
      const moveUpBtn = document.createElement('button')
      moveUpBtn.classList.add('editor-section__btn')
      moveUpBtn.title = 'Move section up'
      moveUpBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`
      moveUpBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        moveSectionUp(editor, getPos)
      })

      // Move Down
      const moveDownBtn = document.createElement('button')
      moveDownBtn.classList.add('editor-section__btn')
      moveDownBtn.title = 'Move section down'
      moveDownBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
      moveDownBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        moveSectionDown(editor, getPos)
      })

      // Menu
      const menuBtn = document.createElement('button')
      menuBtn.classList.add('editor-section__btn')
      menuBtn.title = 'Section menu'
      menuBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const currentNode = editor.state.doc.nodeAt(getPos())
        if (currentNode) {
          createSectionMenu(editor, getPos, currentNode, menuBtn)
        }
      })

      // Add block
      const addBtn = document.createElement('button')
      addBtn.classList.add('editor-section__btn', 'editor-section__btn--add')
      addBtn.title = 'Add block inside section'
      addBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
      addBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const pos = getPos()
        const sectionNode = editor.state.doc.nodeAt(pos)
        if (!sectionNode) return
        // Insert a new paragraph at the end of the section
        const insertPos = pos + sectionNode.nodeSize - 1 // before the closing of the section
        const newParagraph = editor.state.schema.nodes.paragraph.create()
        const tr = editor.state.tr.insert(insertPos, newParagraph)
        // Set cursor into the new paragraph
        const resolvedPos = tr.doc.resolve(insertPos + 1)
        tr.setSelection(editor.state.selection.constructor.near(resolvedPos))
        editor.view.dispatch(tr)
        editor.view.focus()

        // Expand if collapsed
        if (dom.classList.contains('editor-section--collapsed')) {
          dom.classList.remove('editor-section--collapsed')
          updateCollapsedAttr(false)
        }
      })

      controls.append(moveUpBtn, moveDownBtn, menuBtn, addBtn)

      // Collapse click
      collapseBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const isCollapsed = dom.classList.toggle('editor-section--collapsed')
        updateCollapsedAttr(isCollapsed)
      })

      function updateCollapsedAttr(isCollapsed) {
        const pos = getPos()
        if (pos === undefined) return
        const currentNode = editor.state.doc.nodeAt(pos)
        if (!currentNode) return
        const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
          ...currentNode.attrs,
          collapsed: isCollapsed,
        })
        editor.view.dispatch(tr)
      }

      header.append(collapseBtn, titleInput, controls)

      // Content area (ProseMirror renders blocks here)
      const contentDOM = document.createElement('div')
      contentDOM.classList.add('editor-section__content')

      dom.append(header, contentDOM)

      return {
        dom,
        contentDOM,

        update(updatedNode) {
          if (updatedNode.type.name !== 'section') return false
          // Sync attrs
          titleInput.value = updatedNode.attrs.title
          dom.style.setProperty('--section-accent', updatedNode.attrs.color)
          if (updatedNode.attrs.collapsed) {
            dom.classList.add('editor-section--collapsed')
          } else {
            dom.classList.remove('editor-section--collapsed')
          }
          // Update internal node reference for menu
          node = updatedNode
          return true
        },

        destroy() {
          // Cleanup
        },

        stopEvent(event) {
          // Let ProseMirror ignore events that happen in the header
          if (header.contains(event.target)) return true
          return false
        },

        ignoreMutation(mutation) {
          // Ignore mutations that happen in the header
          if (header.contains(mutation.target)) return true
          // Also ignore attribute mutations on the dom itself (class changes, etc.)
          if (mutation.type === 'attributes' && mutation.target === dom) return true
          return false
        },
      }
    }
  },

  addCommands() {
    return {
      insertSection:
        (attrs = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'section',
            attrs: {
              title: attrs.title || 'Untitled Section',
              collapsed: false,
              color: attrs.color || '#5b9a8b',
            },
            content: [
              { type: 'paragraph' },
            ],
          })
        },

      wrapInSection:
        (attrs = {}) =>
        ({ state, chain }) => {
          // Wrap current selection/block in a new section
          const { from, to } = state.selection
          const resolved = state.doc.resolve(from)

          // Find the top-level block
          let depth = resolved.depth
          while (depth > 1) depth--
          if (depth < 1) {
            // Just insert a new section
            return chain().insertSection(attrs).run()
          }

          const blockStart = resolved.before(1)
          const blockEnd = resolved.after(1)
          const blockNode = state.doc.nodeAt(blockStart)

          if (!blockNode) {
            return chain().insertSection(attrs).run()
          }

          // If already inside a section, just insert new one after
          if (blockNode.type.name === 'section') {
            return chain().focus(blockEnd).insertSection(attrs).run()
          }

          // Wrap the current block in a section
          const sectionNode = state.schema.nodes.section.create(
            {
              title: attrs.title || 'Untitled Section',
              collapsed: false,
              color: attrs.color || '#5b9a8b',
            },
            blockNode.content.size > 0 ? blockNode.copy(blockNode.content) : state.schema.nodes.paragraph.create()
          )

          const tr = state.tr.replaceWith(blockStart, blockEnd, sectionNode)
          chain().focus().run()
          return true
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-s': () => {
        this.editor.commands.insertSection()
        return true
      },
    }
  },
})

export default Section
