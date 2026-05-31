import { world } from '@minecraft/server'

world.afterEvents.playerSpawn.subscribe((event) => {
  const { player } = event
  player.sendMessage(`§aWelcome to the server, ${player.name}!`)
})
