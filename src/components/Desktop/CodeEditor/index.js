import '!style-loader!css-loader!./lint.css'
import '!style-loader!css-loader!./../../../../node_modules/codemirror/lib/codemirror.css'
import '!style-loader!css-loader!./codeEditor.css'
import 'codemirror/addon/lint/lint.js'
import React from 'react'

import {connect} from '@cerebral/react'
import {state, signal} from 'cerebral/tags'
import CodeMirror from 'codemirror'
import styles from './styles.css'
import modes from './modes'
import liveStatus from 'computed/liveStatus'

export default connect({
  liveStatus,
  lastForceCodeUpdate: state`code.lastForceCodeUpdate`,
  file: state`app.currentBin.files.${state`app.currentBin.selectedFileIndex`}`,
  lint: state`settings.lint`,
  vimMode: state`settings.vimMode`,
  forceNoLint: state`app.currentBin.forceNoLint`,
  codeChanged: signal`code.codeChanged`,
  codeLinted: signal`code.codeLinted`,
  modeLoading: signal`code.modeLoading`,
  modeLoaded: signal`code.modeLoaded`,
  cursorChanged: signal`code.cursorChanged`
},
  class CodeEditor extends React.Component {
    constructor (props) {
      super(props)
      this.onCodeChange = this.onCodeChange.bind(this)
      this.onUpdateLinting = this.onUpdateLinting.bind(this)
      this.onCursorChange = this.onCursorChange.bind(this)
    }
    componentDidMount () {
      this.codeElement.style.opacity = '0'
      this.codemirror = CodeMirror(this.codeElement, {
        value: this.props.file.content,
        mode: modes.get(),
        autofocus: true,
        theme: 'webpackbin',
        matchTags: {bothTags: true},
        autoCloseTags: true,
        gutters: ['CodeMirror-lint-markers'],
        lint: false,
        lineNumbers: true,
        readOnly: this.props.readOnly ? 'nocursor' : false,
        indentUnit: 2,
        extraKeys: {
          Tab (cm) {
            const spaces = Array(cm.getOption('indentUnit') + 1).join(' ')

            cm.replaceSelection(spaces)
          }
        }
      })
      this.codemirror.on('change', this.onCodeChange)
      this.codemirror.on('cursorActivity', this.onCursorChange)
      modes.preLoadMode('main.js', this.props.lint && !this.props.forceNoLint)
        .then(() => {
          return Promise.all([
            this.setModeAndLinter(),
            this.setVimMode()
          ])
        })
        .then(() => {
          setTimeout(() => {
            this.codeElement.style.opacity = '1'
          }, 500)
        })
    }
    componentDidUpdate (prevProps) {
      if (this.props.liveStatus.isParticipant) {
        this.codemirror.setOption('readOnly', 'nocursor')
      } else if (!prevProps.isLoading && this.props.isLoading) {
        this.codemirror.setOption('readOnly', true)
      } else {
        this.codemirror.setOption('readOnly', false)
      }

      if (!this.props.file) {
        this.setEditorValue('')

        return
      }

      if (
        !prevProps.file ||
        prevProps.file.name !== this.props.file.name ||
        prevProps.lastForceCodeUpdate !== this.props.lastForceCodeUpdate ||
        prevProps.lint !== this.props.lint ||
        prevProps.forceNoLint !== this.props.forceNoLint
      ) {
        this.setModeAndLinter()
        this.focusLastCursorPosition()
      }

      if (prevProps.vimMode !== this.props.vimMode) {
        this.setVimMode()
      }
    }
    focusLastCursorPosition () {
      if (this.props.liveStatus.isParticipant) {
        return
      }

      const component = this
      const lastCursorPosition = this.props.file.lastCursorPosition
      const currentContent = this.codemirror.getDoc().getValue()

      this.codemirror.getInputField().blur()

      function onFocus () {
        component.codemirror.off('focus', onFocus)
        component.codemirror.getDoc().setCursor(lastCursorPosition || {
          line: 0,
          ch: 0
        })
        document.querySelector('.CodeMirror-cursors').style.display = 'block'
      }

      function onChange () {
        component.ignoreNextCursorChange = true
        component.codemirror.on('focus', onFocus)
        component.codemirror.off('change', onChange)
        component.focus()
      }

      document.querySelector('.CodeMirror-cursors').style.display = 'none'
      if (currentContent === this.props.file.content) {
        component.codemirror.on('focus', onFocus)
        this.focus()
      } else {
        component.codemirror.on('change', onChange)
      }
    }
    focus () {
      setTimeout(() => {
        this.codemirror.focus()
      })
    }
    setEditorValue (value) {
      this.isUpdatingCode = true
      this.codemirror.setValue(value)
      this.codemirror.getDoc().clearHistory()
      this.isUpdatingCode = false
    }
    setVimMode () {
      if (this.props.vimMode) {
        import('codemirror/keymap/vim')
          .then(() => {
            this.codemirror.setOption('keyMap', 'vim')
          })
      } else {
        this.codemirror.setOption('keyMap', 'default')
      }
    }
    setModeAndLinter () {
      const modeAlreadyLoaded = modes.isLoaded(this.props.file, this.props.lint && !this.props.forceNoLint)
      const modeToLoad = modes.get(this.props.file)

      if (!modeAlreadyLoaded) {
        this.props.modeLoading()
      }

      modes.set(this.props.file, this.props.lint && !this.props.forceNoLint)
        .then((linter) => {
          // If changed file during loading
          if (modeToLoad !== modes.get(this.props.file)) {
            this.props.modeLoaded({
              modeAlreadyLoaded,
              hasLinter: linter !== false
            })

            return
          }

          if (this.props.lint && !this.props.forceNoLint) {
            this.codemirror.setOption('lint', linter === false ? false : {
              getAnnotations: linter,
              onUpdateLinting: this.onUpdateLinting
            })
          } else {
            this.codemirror.setOption('lint', false)
          }
          this.codemirror.setOption('mode', modes.get(this.props.file).mode)
          this.setEditorValue(this.props.file.content)

          this.props.modeLoaded({
            modeAlreadyLoaded,
            hasLinter: linter !== false
          })
        })
    }
    onUpdateLinting (errors) {
      this.props.codeLinted({
        isValid: !Boolean(errors.length)
      })
    }
    onCodeChange (instance, event) {
      this.ignoreNextCursorChange = true
      if (!this.isUpdatingCode && !this.props.liveStatus.isParticipant) {
        if (event.text.length === 2 && !event.text[0] && !event.text[1]) {
          event.text = ['\n']
        }

        this.props.codeChanged({
          codeChange: {
            from: event.from,
            to: event.to,
            text: event.text
          }
        })
      }
    }
    onCursorChange (instance) {
      if (this.ignoreNextCursorChange || this.props.liveStatus.isParticipant) {
        this.ignoreNextCursorChange = false

        return
      }

      const cursor = this.codemirror.getDoc().getCursor()
      this.props.cursorChanged({
        cursorPosition: {
          line: cursor.line,
          ch: cursor.ch
        }
      })
    }
    render () {
      return (
        <div className={styles.wrapper}>
          <div
            ref={(node) => {
              this.codeElement = node
            }}
            className={styles.codeWrapper} />
        </div>
      )
    }
  }
)
