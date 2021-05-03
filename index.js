const { Context, Random, interpolate } = require('koishi-core')
const { pick } = Random

/**
 *
 * @param {Context} koishi
 * @param {*} pOptions
 */
function apply(koishi, pOptions) {
  koishi = koishi.group().database()

  // 群成员增加
  koishi.on('group-member-added', async (session) => {
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
  koishi.on('group-member-deleted', async (session) => {
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

  // 指令：欢迎
  koishi
    .command('channel.welcome', '配置本频道欢迎辞')
    .option('add', '-a <msg:text> 新增欢迎辞', { authority: 2 })
    .option('remove', '-r <num:posint> 移除欢迎辞', { authority: 2 })
    .option('list', '-l 列出全部欢迎辞')
    .option('test', '-t 测试欢迎辞', { hidden: true })
    .channelFields(['welcomeMsg'])
    .action(async ({ session, options }) => {
      const { add, remove, list, test } = options
      session.channel.welcomeMsg = session.channel.welcomeMsg || []
      let welcomeMsg = session.channel.welcomeMsg

      if (!welcomeMsg || Array.isArray(welcomeMsg) || welcomeMsg.length < 1) {
        session.channel.welcomeMsg = welcomeMsg = []
      }

      if (list) {
        return [
          '本频道目前有以下欢迎辞：',
          welcomeMsg
            .map((item, index) => {
              return `${index + 1}. ${item}`
            })
            .join('\n'),
          welcomeMsg.length < 10 ? '使用“-a <欢迎辞>”添加欢迎辞' : null,
          welcomeMsg.length > 0 ? '使用“-r <数字>”移除欢迎辞' : null
        ].join('\n')
      }

      if (add) {
        if (welcomeMsg.length >= 10) {
          return '您最多只能设置 10 条欢迎辞！'
        } else if (welcomeMsg.includes(add)) {
          return '已经存在相同的欢迎辞。'
        }
        welcomeMsg.push(add)
        return '已添加新的欢迎辞。'
      }

      if (remove) {
        if (welcomeMsg[remove - 1]) {
          const msg = welcomeMsg[remove - 1]
          welcomeMsg.splice(remove - 1, 1)
          return `已移除第 ${remove} 条欢迎辞：${msg}`
        }

        return `不存在第 ${remove} 条欢迎辞！`
      }

      if (test) {
        return interpolate(pick(welcomeMsg), {
          a: session.userId,
          n: session.username
        })
      }

      return session.execute('channel.welcome -h')
    })
  // 指令：告别
  koishi
    .command('channel.farewell', '配置本频道告别辞')
    .alias('channel.goodbye')
    .option('add', '-a <msg:text> 新增告别辞', { authority: 2 })
    .option('remove', '-r <num:posint> 移除告别辞', { authority: 2 })
    .option('list', '-l 列出全部告别辞')
    .option('test', '-t 测试告别辞', { hidden: true })
    .channelFields(['farewellMsg'])
    .action(async ({ session, options }) => {
      const { add, remove, list, test } = options
      session.channel.farewellMsg = session.channel.farewellMsg || []
      let farewellMsg = session.channel.farewellMsg

      if (
        !farewellMsg ||
        Array.isArray(farewellMsg) ||
        farewellMsg.length < 1
      ) {
        session.channel.farewellMsg = farewellMsg = []
      }

      if (list) {
        return [
          '本频道目前有以下告别辞：',
          farewellMsg
            .map((item, index) => {
              return `${index + 1}. ${item}`
            })
            .join('\n'),
          farewellMsg.length < 10 ? '使用“-a <告别辞>”添加告别辞' : null,
          farewellMsg.length > 0 ? '使用“-r <数字>”移除告别辞' : null
        ].join('\n')
      }

      if (add) {
        if (farewellMsg.length >= 10) {
          return '您最多只能设置 10 条告别辞！'
        } else if (farewellMsg.includes(add)) {
          return '已经存在相同的告别辞。'
        }
        farewellMsg.push(add)
        return '已添加新的告别辞。'
      }

      if (remove) {
        if (farewellMsg[remove - 1]) {
          const msg = farewellMsg[remove - 1]
          farewellMsg.splice(remove - 1, 1)
          return `已移除第 ${remove} 条告别辞：${msg}`
        }

        return `不存在第 ${remove} 条告别辞！`
      }

      if (test) {
        return interpolate(pick(farewellMsg), {
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
