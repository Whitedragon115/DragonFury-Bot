const { PrismaClient } = require('../generated/prisma/client.ts')
const { PrismaMariaDb } = require('@prisma/adapter-mariadb')

const apdapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
})

const prisma = new PrismaClient({ adapter: apdapter })

async function getEgg(id) {

    const egg = await prisma.eggs.findUnique({
        where: {
            id: id
        }
    })

    const egg_variables = await prisma.egg_variables.findMany({
        where: {
            egg_id: id
        }
    })

    const egg_images = JSON.parse(egg.docker_images)

    const useful = {
        egg_startup: egg.startup,
        egg_docker_image: egg_images[Object.keys(egg_images)[0]],
        required_variables: egg_variables.filter(v => v.rules.startsWith('required')).reduce((acc, v) => {
            acc[v.env_variable] = v.default_value
            return acc
        }, {}),
    }

    return {
        useful: useful,
        raw: {
            egg: egg,
            egg_variables: egg_variables
        }
    }

}

async function getAvailableAllocations(ports, node) {

    const allocations = await prisma.allocations.findMany({
        where: {
            node_id: node,
            port: {
                in: ports
            }
        }
    })

    const toCreate = ports.filter(port => !allocations.some(a => a.port === port))
    const collisions = allocations.filter(a => ports.includes(a.port)).map(a => a.port)

    return {
        toCreate: toCreate,
        collisions: collisions
    }
}

async function checkAllocations(ports, node) {
    const allocations = await prisma.allocations.findMany({
        where: {
            node_id: node,
            port: {
                in: ports
            },
            server_id: null
        }
    })

    return allocations.length === ports.length ? true : false
}

async function getUsers(name, mail) {
    return await prisma.users.findMany({
        where: {
            OR: [
                { username: { contains: name } },
                { email: { contains: mail } }
            ]
        }
    })
}

async function getUser(id) {
    return await prisma.users.findUnique({
        where: {
            id: id
        }
    })
}

async function getEggs(name) {
    return await prisma.eggs.findMany({
        where: {
            name: { contains: name }
        }
    })
}


async function getNodes(name) {
    return await prisma.nodes.findMany({
        where: {
            name: { contains: name }
        }
    })
}

async function getNode(id) {
    return await prisma.nodes.findUnique({
        where: {
            id: id
        }
    })
}

async function getAllocations(node, ports) {
    return await prisma.allocations.findMany({
        where: {
            node_id: node,
            port: ports
        }
    })
}

async function getAllocation(id) {
    return await prisma.allocations.findUnique({
        where: {
            id: id
        }
    })
}

module.exports = {
    getAvailableAllocations,
    checkAllocations,
    getUsers,
    getUser,
    getEggs,
    getEgg,
    getNodes,
    getNode,
    getAllocations,
    getAllocation
}