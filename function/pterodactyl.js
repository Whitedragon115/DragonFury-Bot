const { PterodactylAPIClient } = require('pterodactyl-api-client')
const { getEgg, getAvailableAllocations, checkAllocations, getAllocations, getAllocation } = require('./prisma')
const logger = require('./log')


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

    if (allocations.toCreate.length > 0) {
        await panel.node(node).allocations.create({
            ip: '0.0.0.0',
            ports: allocations.toCreate.map(port => port.toString()),
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
    const preAllocation = await allocationCreator(server.ports, server.node)
    const allocations = []

    for (const port of server.ports) {
        const alloc = await getAllocations(server.node, port)
        allocations.push(alloc[0].id)
    }

    if (!preAllocation.success) return {
        success: false,
        error: preAllocation.error
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
            memory: server.resources.ram,
            swap: 0,
            disk: server.resources.disk,
            io: 500,
            cpu: server.resources.cpu
        },
        feature_limits: {
            databases: server.database,
            allocations: server.allocations,
            backups: server.backups
        },
        allocation: {
            default: allocations[0],
            additional: allocations.slice(1)
        }
    }

    const createServer = await panel.servers.create(config).then(res => {
        return {
            success: true,
            serverId: res.attributes
        }
    }).catch(err => {
        logger.error('Failed to create server:' + err)
        return {
            success: false,
            error: err.response ? err.response.data.errors : err.message
        }
    })

    return createServer
}

async function serverDeleter(serverId) {

    const deleteServer = await panel.server({ id: serverId }).delete()

    return deleteServer
}

module.exports = {
    serverCreator,
    serverDeleter
}