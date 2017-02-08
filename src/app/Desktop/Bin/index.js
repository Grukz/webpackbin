import config from 'config'
import Inferno from 'inferno'
import {connect} from 'cerebral/inferno'
import CodeEditor from 'components/CodeEditor'
import MainNavigation from './MainNavigation'
import FilesBar from './FilesBar'
import Preview from 'components/Preview'
import styles from './styles.css'
import {state, signal} from 'cerebral/tags'

export default connect({
  isLoading: state`bin.isLoading`,
  lastSavedDatetime: state`bin.lastSavedDatetime`,
  files: state`bin.files.list`,
  currentBin: state`bin.currentBin`,
  selectedFileIndex: state`bin.files.selectedFileIndex`,
  codeChanged: signal`bin.codeChanged`,
  codeLinted: signal`bin.codeLinted`,
  linterLoading: signal`bin.linterLoading`,
  linterLoaded: signal`bin.linterLoaded`,
  cursorChanged: signal`bin.cursorChanged`
},
  function Desktop ({
    files,
    currentBin,
    isLoading,
    lastSavedDatetime,
    codeChanged,
    selectedFileIndex,
    codeLinted,
    linterLoading,
    linterLoaded,
    cursorChanged
  }) {
    return (
      <div className={styles.wrapper}>
        <MainNavigation />
        <FilesBar />
        <div className={styles.editorWrapper}>
          <CodeEditor
            isLoading={false}
            bin={currentBin}
            file={files[selectedFileIndex]}
            onChange={codeChanged}
            onLint={codeLinted}
            onLinterLoading={linterLoading}
            onLinterLoaded={linterLoaded}
            onCursorChange={cursorChanged}
            />
          {
            isLoading
            ? null
            : (
              <Preview
                src={config.sandboxServiceUrl}
                lastSavedDatetime={lastSavedDatetime}
              />
            )
          }
        </div>
      </div>
    )
  }
)
