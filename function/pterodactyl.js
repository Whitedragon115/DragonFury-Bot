const { PterodactylAPIClient } = require('pterodactyl-api-client')
const { getEgg, getAvailableAllocations, checkAllocations } = require('./prisma')


const panel = new PterodactylAPIClient({
    panelUrl: process.env.PANEL_URL,
    apiKey: process.env.PANEL_APPLICATION_KEY,
    role: 'admin'
}).admin

async function allocationCreator(location, node) {

    const allocations = await getAvailableAllocations(location, node)
    if (allocations.collisions.length > 0) return {
        success: false,
        error: `The following ports are already allocated on the node: ${allocations.collisions.join(', ')}`
    }

    const aliasName = (await panel.node(node).info()).attributes.name.toLowerCase().replace(/\s/g, '')

    for (const port of allocations.toCreate) {
        await panel.node(node).allocations.create({
            ip: '0.0.0.0',
            ports: port,
            alias: aliasName
        })
    }

    if (!await checkAllocations(location, node)) return {
        success: false,
        error: 'Failed to create all allocations'
    }

    return {
        success: true
    }
}

async function serverCreator(server) {

    const egg_details = await getEgg(server.egg)
    const allocation = await allocationCreator(server.ports, server.node)

    if (!allocation.success) return {
        success: false,
        error: allocation.error
    }

    const config = {
        name: server.name,
        user: server.user,
        egg: server.egg,
        node: server.node,
        docker_image: egg_details.useful.egg_docker_image,
        startup: egg_details.useful.egg_startup,
        environment: egg_details.useful.required_variables,
        limits: {
            memory: server.ram,
            swap: 0,
            disk: server.disk,
            io: 500,
            cpu: server.cpu
        },
        feature_limits: {
            databases: server.database,
            allocations: server.ports.length,
            backups: server.backups
        },
        allocation: {
            default: server.ports[0],
            additional: server.ports.slice(1)
        }
    }

    const createServer = await panel.servers.create(config).then(res => {
        return {
            success: true,
            serverId: res.attributes
        }
    }).catch(err => {
        return {
            success: false,
            error: err.response ? err.response.data.errors : err.message
        }
    })

    return createServer
}

module.exports = {
    serverCreator
}