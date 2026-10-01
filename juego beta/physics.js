// ==========================================
// --- MÓDULO DE FÍSICAS REESTRUCTURADO ---
// ==========================================
const PhysicsEngine = {
    playerMat: new CANNON.Material('player'),
    platformMat: new CANNON.Material('platform'),

    initWorld: () => {
        const world = new CANNON.World();
        world.gravity.set(0, -30, 0);
        // Sin fricción entre jugador y plataformas: no se queda pegado a las paredes al saltar contra ellas
        world.addContactMaterial(new CANNON.ContactMaterial(PhysicsEngine.playerMat, PhysicsEngine.platformMat, { friction: 0, restitution: 0 }));
        return world;
    },

    createPlayerBody: (x, y, z) => {
        const body = new CANNON.Body({ mass: 2.5, shape: new CANNON.Sphere(0.8) });
        body.position.set(x, y, z);
        body.fixedRotation = true;
        body.material = PhysicsEngine.playerMat;
        return body;
    },

    createEnemyBody: (x, y, z) => {
        const body = new CANNON.Body({ mass: 1.5, shape: new CANNON.Sphere(0.85) });
        body.position.set(x, y, z);
        body.fixedRotation = true;
        return body;
    },

    createPlatformBody: (x, y, z, width, height, depth) => {
        const body = new CANNON.Body({ 
            mass: 0, 
            shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)) 
        });
        body.position.set(x, y, z);
        body.material = PhysicsEngine.platformMat;
        return body;
    }
};