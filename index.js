/**
 * @name koishi-plugni-welcome
 * @desc Random custom welcome/farewell messages
 *
 * @author 机智的小鱼君 <dragon-fish@qq.com>
 * @license Apache-2.0
 */
const { Context, Random, interpolate, template } = require('koishi-core')
const { pick } = Random

template.set('plugin-welcome', {})

/**
 * @param {Context} ctx
 * @param {*} pOptions
 */
function apply(ctx, pOptions) {
  ctx = ctx.group().select('database')
  pOptions = {
    maxWelcome: 10,
    maxFarewell: 10,
    ...pOptions
  }

  // 群成员增加
  ctx.on('group-member-added', async (session) => {
    if (session.userId === session.selfId) return

    const at = segment('at', { id: session.userId })
    const [user, channel] = await Promise.all([
      session.getUser(session.platform, session.userId, ['name']),
      session.database.getChannel(session.platform, session.channelId, [
        'welcomeMsg'
      ])
    ])
    const { name } = user
    let { welcomeMsg } = channel
    if (!welcomeMsg || !Array.isArray(welcomeMsg) || welcomeMsg.length < 1) {
      return
    }

    const msg = interpolate(pick(welcomeMsg), { a: at, n: name })

    session.send(msg)
  })

  // 群成员增加
  ctx.on('group-member-deleted', async (session) => {
    if (session.userId === session.selfId) return

    const at = session.userId
    const [channel] = await Promise.all([
      session.database.getChannel(session.platform, session.channelId, [
        'farewellMsg'
      ])
    ])
    let { farewellMsg } = channel
    if (!farewellMsg || !Array.isArray(farewellMsg) || farewellMsg.length < 1) {
      return
    }

    const msg = interpolate(pick(farewellMsg), { a: at })

    session.send(msg)
  })

  // cmd.welcome
  ctx
    .command('channel.welcome', '配置本频道欢迎辞', { authority: 2 })
    .option('add', '-a <msg:text> 新增欢迎辞', { authority: 2 })
    .option('remove', '-r <num:posint> 移除欢迎辞', { authority: 2 })
    .option('list', '-l 列出全部欢迎辞')
    .option('test', '-t 测试欢迎辞', { hidden: true })
    .channelFields(['welcomeMsg'])
    .action(async ({ session, options }) => {
      const { add, remove, list, test } = options
      const { channel } = session

      if (
        !channel.welcomeMsg ||
        Array.isArray(channel.welcomeMsg) ||
        channel.welcomeMsg.length < 1
      ) {
        channel.welcomeMsg = []
      }

      console.log(session.channel.welcomeMsg)

      if (list) {
        return [
          '本频道目前有以下欢迎辞：',
          channel.welcomeMsg
            .map((item, index) => {
              return `${index + 1}. ${item}`
            })
            .join('\n'),
          channel.welcomeMsg.length < 10 ? '使用“-a <欢迎辞>”添加欢迎辞' : null,
          channel.welcomeMsg.length > 0 ? '使用“-r <数字>”移除欢迎辞' : null
        ].join('\n')
      }

      if (add) {
        if (channel.welcomeMsg.length >= pOptions.maxWelcome) {
          return `您最多只能设置 ${pOptions.maxWelcome} 条欢迎辞！`
        } else if (channel.welcomeMsg.includes(add)) {
          return '已经存在相同的欢迎辞。'
        }
        channel.welcomeMsg.push(add)
        await channel._update()
        console.log(session.channel.welcomeMsg)
        return '已添加新的欢迎辞。'
      }

      if (remove) {
        if (channel.welcomeMsg[remove - 1]) {
          const msg = channel.welcomeMsg[remove - 1]
          channel.welcomeMsg.splice(remove - 1, 1)
          return `已移除第 ${remove} 条欢迎辞：${msg}`
        }

        return `不存在第 ${remove} 条欢迎辞！`
      }

      if (test) {
        return interpolate(pick(channel.welcomeMsg), {
          a: session.userId,
          n: session.username
        })
      }

      return session.execute('channel.welcome -h')
    })

  // cmd.farewell
  ctx
    .command('channel.farewell', '配置本频道告别辞', { authority: 2 })
    .alias('channel.goodbye')
    .option('add', '-a <msg:text> 新增告别辞', { authority: 2 })
    .option('remove', '-r <num:posint> 移除告别辞', { authority: 2 })
    .option('list', '-l 列出全部告别辞')
    .option('test', '-t 测试告别辞', { hidden: true })
    .channelFields(['farewellMsg'])
    .action(async ({ session, options }) => {
      const { add, remove, list, test } = options
      const { channel } = session

      if (
        !channel.farewellMsg ||
        Array.isArray(channel.farewellMsg) ||
        channel.farewellMsg.length < 1
      ) {
        channel.farewellMsg = []
      }

      if (list) {
        return [
          '本频道目前有以下告别辞：',
          channel.farewellMsg
            .map((item, index) => {
              return `${index + 1}. ${item}`
            })
            .join('\n'),
          channel.farewellMsg.length < 10
            ? '使用“-a <告别辞>”添加告别辞'
            : null,
          channel.farewellMsg.length > 0 ? '使用“-r <数字>”移除告别辞' : null
        ].join('\n')
      }

      if (add) {
        if (channel.farewellMsg.length >= pOptions.maxFarewell) {
          return `您最多只能设置 ${pOptions.maxFarewell} 条告别辞！`
        } else if (channel.farewellMsg.includes(add)) {
          return '已经存在相同的告别辞。'
        }
        channel.farewellMsg.push(add)
        return '已添加新的告别辞。'
      }

      if (remove) {
        if (channel.farewellMsg[remove - 1]) {
          const msg = channel.farewellMsg[remove - 1]
          channel.farewellMsg.splice(remove - 1, 1)
          return `已移除第 ${remove} 条告别辞：${msg}`
        }

        return `不存在第 ${remove} 条告别辞！`
      }

      if (test) {
        return interpolate(pick(channel.farewellMsg), {
          a: session.userId
        })
      }

      return session.execute('channel.farewell -h')
    })
}

module.exports = {
  name: 'welcome-pro-max',
  apply
}
