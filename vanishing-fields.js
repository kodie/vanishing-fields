/*!
  vanishing-fields v0.0.1 (https://github.com/kodie/vanishing-fields)
  by Kodie Grantham (https://kodieg.com)
*/

var vanishingFields = function (options, fields) {
  if (!options) options = {}
  if (!fields) fields = '[data-vanishing-field]:not(data-vanishing-field-ignore)'

  if (typeof fields === 'string') {
    fields = document.querySelectorAll(fields)
  } else if (fields instanceof HTMLElement) {
    fields = [fields]
  }

  if (vanishingFields.fieldCount === undefined) {
    vanishingFields.fieldCount = 0
    vanishingFields.lastTabIndex = -1
  } else {
    if (!options.startingTabIndex) {
      options.startingTabIndex = (vanishingFields.lastTabIndex + 1)
    }
  }

  for (var i = 0; i < fields.length; i++) {
    (function (field) {
      var identifier = field.getAttribute('data-vanishing-field')

      if (!identifier.length) {
        console.warn(field, 'data-vanishing-field attribute needs to be set to a string')
        return false
      }

      vanishingFields.fieldCount++

      field.label = document.querySelector("[data-vanishing-field-for=\"" + identifier + "\"]")
      field.inputs = field.querySelectorAll('input:not(data-vanishing-field-ignore),textarea:not(data-vanishing-field-ignore),select:not(data-vanishing-field-ignore)')

      field.options = Object.assign({
        applyStyles: true,
        closeOnFocusOut: true,
        devMode: false,
        display: null,
        onClose: null,
        onOpen: null,
        options: {},
        placeholder: null,
        startingTabIndex: 0
      }, options || {})

      if (field.options.options[identifier]) {
        field.options = Object.assign(field.options, options.options[identifier])
      }

      delete field.options.options

      var applyStylesAttr = field.getAttribute('data-vanishing-field-apply-styles')
      if (applyStylesAttr) field.options.applyStyles = applyStylesAttr === 'false' ? false : true

      var closeOnFocusOutAttr = field.getAttribute('data-vanishing-field-close-on-focus-out')
      if (closeOnFocusOutAttr) field.options.closeOnFocusOut = closeOnFocusOutAttr === 'false' ? false : true

      if (field.label) {
        field.label.display = field.label.getAttribute('data-vanishing-field-display') || field.options.display
        field.label.placeholder = field.label.getAttribute('data-vanishing-field-placeholder') || field.options.placeholder

        if (field.options.startingTabIndex !== false && !field.label.getAttribute('tabindex')) {
          field.label.setAttribute('tabindex', field.options.startingTabIndex + i)
        }
      }

      if (field.options.startingTabIndex !== false && !field.getAttribute('tabindex')) {
        field.setAttribute('tabindex', field.options.startingTabIndex + i)
        vanishingFields.lastTabIndex = (field.options.startingTabIndex + i)
      }

      field.open = function (triggerEvents) {
        if (field.options.devMode) console.log(identifier, 'open')
        if (field.opened === true) return field

        field.opened = true

        if (field.options.applyStyles) {
          field.style['display'] = null
          field.style['visibility'] = null

          if (field.label) {
            field.label.style['display'] = 'none'
            field.label.style['visibility'] = 'hidden'
          }
        }

        field.classList.toggle('open', field.opened)
        if (field.label) field.label.classList.toggle('open', field.opened)

        field.focus()

        if (triggerEvents !== false) {
          field.dispatchEvent(new Event('open', { bubbles: true }))
        }

        return field
      }

      field.close = function (triggerEvents) {
        if (field.options.devMode) console.log(identifier, 'close')
        if (field.opened === false) return field

        field.opened = false
        field.values = field.getInputValues()

        if (field.options.applyStyles) {
          field.style['display'] =  'none'
          field.style['visibility'] = 'hidden'

          if (field.label) {
            field.label.style['display'] = null
            field.label.style['visibility'] = null
          }
        }

        var inputValues = Object.values(field.values).filter(function (v) { return v && v.length })

        field.changed = false
        field.empty = !inputValues.length

        for (var name in field.values) {
          if (field.values.hasOwnProperty(name)) {
            if (Array.isArray(field.values[name])) {
              if (field.values[name].sort().join(',') !== field.originalValues[name].sort().join(',')) {
                field.changed = true
                break
              }
            } else {
              if (field.values[name] !== field.originalValues[name]) {
                field.changed = true
                break
              }
            }
          }
        }

        field.classList.toggle('open', field.opened)
        field.classList.toggle('changed', field.changed)
        field.classList.toggle('empty', field.empty)

        if (field.label) {
          field.label.classList.toggle('open', field.opened)
          field.label.classList.toggle('changed', field.changed)
          field.label.classList.toggle('empty', field.empty)

          if (field.empty) {
            if (field.label.placeholder) {
              if (typeof field.label.placeholder === 'function') {
                field.label.innerHTML = field.label.placeholder(field)
              } else {
                field.label.innerHTML = field.label.placeholder
              }
            } else {
              field.label.innerHTML = ''
            }
          } else {
            if (field.label.display) {
              if (typeof field.label.display === 'function') {
                field.label.innerHTML = field.label.display(field)
              } else {
                field.label.innerHTML = field.label.display.replace(/{(.+?)}/g, function (match, name) {
                  var split = name.split('|')
                  var value = field.values[split[0]] || split[1] || match
                  if (Array.isArray(value)) value = value.join(split[2] || ',')
                  return value
                })
              }
            } else {
              field.label.innerHTML = inputValues.join(' ')
            }
          }
        }

        if (triggerEvents !== false) {
          field.dispatchEvent(new Event('close', { bubbles: true }))
        }

        return field
      }

      field.toggle = function (open, triggerEvents) {
        if (field.options.devMode) console.log(identifier, 'toggle')

        if (open === true || (open === undefined && !field.opened)) {
          field.open(triggerEvents)
        } else if (open === false || (open === undefined && field.opened)) {
          field.close(triggerEvents)
        }

        return field
      }

      field.getInputValues = function () {
        var values = {}

        if (field.inputs.length) {
          values = Array.from(field.inputs).reduce(function (values, input) {
            var name = input.name || input.id
            var value = input.value
            var tagName = input.tagName.toLowerCase()

            if (name.slice(-2) === '[]') {
              name = name.substr(0, name.length - 2)
              value = [value]
            }

            if (tagName === 'select' && input.multiple) {
              value = Array.from(input.selectedOptions).map(function (option) {
                return option.value
              })
            }

            if (input.type === 'file') {
              value = Array.from(input.files).map(function (file) {
                return file.name
              })
            }

            if ((input.type === 'checkbox' || input.type === 'radio') && !input.checked) {
              if (values[name]) return values
              value = Array.isArray(value) ? [] : null
            }

            if (values[name]) {
              if (Array.isArray(values[name])) {
                value = values[name].concat([value])
              } else {
                value = [values[name], value]
              }

              value = value.filter(function (v) { return v && v.length })
            }

            values[name] = value
            return values
          }, {})
        }

        if (field.options.devMode) console.log(identifier, 'input values:', values)

        return values
      }

      if (field.label) {
        field.label.addEventListener('click', function (e) {
          e.stopImmediatePropagation()
          if (field.options.devMode) console.log(identifier, 'label click')
          field.open()
        })

        field.label.addEventListener('focusin', function (e) {
          e.stopImmediatePropagation()
          if (field.options.devMode) console.log(identifier, 'label focusin')
          field.open()
        })
      }

      field.addEventListener('focusout', function (e) {
        if (field.contains(e.relatedTarget) || field.contains(document.activeElement)) return
        e.stopImmediatePropagation()
        if (field.options.devMode) console.log(identifier, 'focusout')
        if (field.options.closeOnFocusOut) field.close()
      })

      if (field.options.onOpen) {
        field.addEventListener('open', function (e) {
          e.stopImmediatePropagation()
          if (field.options.devMode) console.log(identifier, 'onOpen')
          field.options.onOpen(e, field)
        })
      }

      if (field.options.onClose) {
        field.addEventListener('close', function (e) {
          e.stopImmediatePropagation()
          if (field.options.devMode) console.log(identifier, 'onClose')
          field.options.onClose(e, field)
        })
      }

      var openElements = document.querySelectorAll("[data-vanishing-field-open=\"" + identifier + "\"]")
      for (var j1 = 0; j1 < openElements.length; j1++) {
        (function (openElement) {
          openElement.addEventListener('click', function (e) {
            if (e.target !== e.currentTarget) return
            e.stopImmediatePropagation()
            if (field.options.devMode) console.log(identifier, 'openElement click', openElement)
            field.open()
          })
        })(openElements[j1])
      }

      var closeElements = document.querySelectorAll("[data-vanishing-field-close=\"" + identifier + "\"]")
      for (var j2 = 0; j2 < closeElements.length; j2++) {
        (function (closeElement) {
          closeElement.addEventListener('click', function (e) {
            if (e.target !== e.currentTarget) return
            e.stopImmediatePropagation()
            if (field.options.devMode) console.log(identifier, 'closeElement click', closeElement)
            field.close()
          })
        })(closeElements[j2])
      }

      var toggleElements = document.querySelectorAll("[data-vanishing-field-toggle=\"" + identifier + "\"]")
      for (var j3 = 0; j3 < toggleElements.length; j3++) {
        (function (toggleElement) {
          toggleElement.addEventListener('click', function (e) {
            if (e.target !== e.currentTarget) return
            e.stopImmediatePropagation()
            if (field.options.devMode) console.log(identifier, 'toggleElement click', toggleElement)
            field.toggle()
          })
        })(toggleElements[j3])
      }

      field.values = field.getInputValues()
      field.originalValues = Object.assign({}, field.values)

      var inputValues = Object.values(field.values).filter(function (v) { return v && v.length })

      field.changed = false
      field.empty = !inputValues.length

      field.classList.toggle('empty', field.empty)
      if (field.label) field.label.classList.toggle('empty', field.empty)

      if (field.classList.contains('open')) {
        field.open(false)
      } else {
        field.close(false)
      }
    })(fields[i])
  }

  return fields
}
