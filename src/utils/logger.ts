import ora from 'ora'
import pc from 'picocolors'

let spinner: ReturnType<typeof ora> | null = null

export function info(msg: string) {
  console.log(pc.cyan(`  ${msg}`))
}

export function success(msg: string) {
  console.log(pc.green(`  ✓ ${msg}`))
}

export function warn(msg: string) {
  console.log(pc.yellow(`  ⚠ ${msg}`))
}

export function error(msg: string) {
  console.log(pc.red(`  ✗ ${msg}`))
}

export function step(msg: string) {
  console.log()
  console.log(pc.bold(pc.blue(`  ${msg}`)))
}

export function spinnerStart(msg: string) {
  spinner = ora({ text: msg, color: 'cyan' }).start()
}

export function spinnerSucceed(msg?: string) {
  spinner?.succeed(msg)
  spinner = null
}

export function spinnerFail(msg?: string) {
  spinner?.fail(msg)
  spinner = null
}

export function logFileChange(file: string, action: 'updated' | 'added' | 'removed') {
  const icon = action === 'removed' ? pc.red('✗') : pc.green('✓')
  const label = action === 'updated' ? 'updated' : action === 'added' ? 'added' : 'removed'
  console.log(`  ${icon} ${pc.dim(file)} ${pc.dim(label)}`)
}
