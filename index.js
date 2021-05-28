/**
 * @name koishi-plugni-welcome
 * @desc Random custom welcome/farewell messages
 *
 * @author 机智的小鱼君 <dragon-fish@qq.com>
 * @license Apache-2.0
 */
const {
  Context,
  Random,
  interpolate,
  template,
  segment,
  Session,
  Logger,
} = require('koishi-core')
const { pick } = Random
const logger = new Logger('plugin-welcome')

template.set('plugin-welcome', {})

function normallize(str) {
  return str.replace(/[\s,\.\!\?\~，。！？]/g, '')
}

/**
 * @param {Context} ctx
 * @param {*} pOptions
 */
function apply(ctx, pOptions) {
  // 群成员增加
  ctx.on('group-member-added', (session) => {
    if (session.userId === session.selfId) return
    sendGreeting({ session, options: { type: 'welcome' } }).then((msg) => {
      console.log('added', session, msg)
      session.send(msg)
    })
  })

  // 群成员增加
  ctx.on('group-member-deleted', (session) => {
    if (session.userId === session.selfId) return
    sendGreeting({ session, options: { type: 'farewell' } }).then((msg) => {
      console.log('deleted', session, msg)
      session.send(msg)
    })
  })

  ctx = ctx.select('channel').select('database')
  ctx.command('greeting', '欢迎辞、告别语配置')
  pOptions = {
    maxWelcome: 10,
    maxFarewell: 10,
    ...pOptions,
  }

  const sendGreeting = async ({ session, options }) => {
    /**
     * @type {Session} sess
     */
    const sess = session
    const { type } = options
    if (!['welcome', 'farewell'].includes(type)) return
    const channel = await sess.database.getChannel(
      sess.platform,
      sess.channelId,
      [`${type}Msg`]
    )
    const { name: nickName } = await sess.database.getUser(
      sess.platform,
      sess.userId,
      ['name']
    )
    let msgList = channel[`${type}Msg`]
    if (!msgList || !Array.isArray(msgList) || msgList.length < 1) {
      msgList = []
      return
    }
    const params = {
      atUser: segment.at(session.userId),
      userName: session.username,
      nickName,
      userId: session.userId,
    }

    return interpolate(pick(msgList), params)?.trim() || ''
  }

  ctx
    .command('greeting.send', '内部指令，请勿直接调用', { hidden: true })
    .option('type', `<type>`)
    .action(sendGreeting)

  ctx
    .command('greeting.config', '内部指令，请勿直接调用', { hidden: true })
    .option('type', '<type>')
    .option('add', '-a <msg:text> 新增', { authority: 2 })
    .option('remove', '-r <num:posint> 移除', { authority: 2 })
    .option('list', '-l 列出全部')
    .option('test', '-t [target] 测试', { hidden: true })
    .channelFields(['welcomeMsg', 'farewellMsg'])
    .check(async ({ session }) => {
      // Init data
      ;['welcomeMsg', 'farewellMsg'].forEach((item) => {
        if (
          !session.channel[item] ||
          !Array.isArray(session.channel[item]) ||
          session.channel[item].length < 1
        ) {
          session.channel[item] = []
        }
      })
      await session.channel._update()
    })
    .action(async ({ session, options }) => {
      const { type, add, remove, list, test } = options
      const { channel } = session
      if (!['welcome', 'farewell'].includes(type)) return
      const typeName = type === 'welcome' ? '欢迎辞' : '告别语'
      const msgList =
        type === 'welcome' ? channel.welcomeMsg : channel.farewellMsg

      if (list) {
        return [
          `本频道目前有以下${typeName}：`,
          msgList
            .map((item, index) => {
              return `${index + 1}. ${item}`
            })
            .join('\n') || '(无)',
          msgList.length < 10 ? `使用“-a <${typeName}>”添加欢迎辞` : null,
          msgList.length > 0 ? `使用“-r <数字>”移除${typeName}` : null,
        ].join('\n')
      }

      if (add) {
        if (msgList.length >= pOptions.maxWelcome) {
          return `您最多只能设置 ${pOptions.maxWelcome} 条${typeName}！`
        } else if (
          msgList.find((item) => normallize(item) === normallize(add))
        ) {
          return `已经存在相同的${typeName}。`
        }
        msgList.push(add)
        await channel._update()
        return `已添加新的${typeName}。`
      }

      if (remove) {
        if (msgList[remove - 1]) {
          const msg = msgList[remove - 1]
          msgList.splice(remove - 1, 1)
          await channel._update()
          return `已移除第 ${remove} 条${typeName}：${msg}`
        }

        return `不存在第 ${remove} 条${typeName}！`
      }

      if (test) {
        return session.execute(`greeting.send --type ${type}`)
      }

      return session.execute(`${type} -h`)
    })

  function optionsToStr(opt) {
    let str = ''
    for (let key in opt) {
      str += ` --${key} ${opt[key]}`
    }
    return str
  }

  ctx
    .command('greeting/welcome', '配置本频道欢迎辞', { authority: 2 })
    .option('add', '-a <msg:text> 新增欢迎辞', { authority: 2 })
    .option('remove', '-r <num:posint> 移除欢迎辞', { authority: 2 })
    .option('list', '-l 列出全部欢迎辞')
    .option('test', '-t 测试欢迎辞', { hidden: true })
    .action(({ session, options }) => {
      return session.execute(
        `greeting.config --type welcome ${optionsToStr(options)}`
      )
    })

  // cmd.farewell
  ctx
    .command('greeting/farewell', '配置本频道告别辞', { authority: 2 })
    .option('add', '-a <msg:text> 新增告别辞', { authority: 2 })
    .option('remove', '-r <num:posint> 移除告别辞', { authority: 2 })
    .option('list', '-l 列出全部告别辞')
    .option('test', '-t 测试告别辞', { hidden: true })
    .channelFields(['farewellMsg'])
    .action(({ session, options }) => {
      return session.execute(
        `greeting.config --type farewell ${optionsToStr(options)}`
      )
    })
}

module.exports = {
  name: 'welcome-pro-max',
  apply,
}
