// ==========================================
// --- MÓDULO RENDER 3D (PERSONAJES & DEMONIOS MEJORADOS) ---
// ==========================================
const textureLoader = new THREE.TextureLoader();

const Render3D = {
    setupScene: (container, width, height, bgHex) => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(bgHex);
        scene.fog = new THREE.FogExp2(bgHex, 0.002);

        const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // nítido en pantallas HiDPI sin disparar el costo
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = false; // las sombras no se veían (el frustum por defecto solo cubre ±5 unidades) y costaban un mapa de 2048x2048 por cuadro
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        container.appendChild(renderer.domElement);

        // Luz cálida de atardecer Sanrio World
        const ambientLight = new THREE.AmbientLight(0xffd8b0, 1.1);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xffab73, 0xb659c9, 0.9);
        hemiLight.position.set(0, 50, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xff9d5c, 1.4);
        dirLight.position.set(60, 18, 15);
        dirLight.castShadow = false;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.0001;
        scene.add(dirLight);

        // Toque de color extra tipo "arcoíris kawaii" para dar vida al ambiente
        const rimPink = new THREE.PointLight(0xff4fa3, 0.6, 60);
        rimPink.position.set(-20, 12, 10);
        scene.add(rimPink);

        const rimGold = new THREE.PointLight(0xffd54f, 0.6, 60);
        rimGold.position.set(20, 10, -10);
        scene.add(rimGold);

        renderer.toneMappingExposure = 1.3;

        return { scene, camera, renderer };
    },

    createPlayerMesh: (skinKey) => {
        let playerGroup;
        if (skinKey === 'kitty') {
            playerGroup = Render3D.createSpriteCharacter('sprites_kitty.png', 'grid4x4');
        } else if (skinKey === 'kuromi') {
            playerGroup = Render3D.createSpriteCharacter('sprites_luna.png', 'grid4x4');
        } else if (skinKey === 'mymelody') {
            playerGroup = Render3D.createSpriteCharacter('sprites_sakura.png', 'grid4x4');
        } else if (skinKey === 'cinnamon') {
            playerGroup = Render3D.createSpriteCharacter('sprites_nube.png', 'grid4x4');
        } else if (skinKey === 'purin') {
            playerGroup = Render3D.createSpriteCharacter('sprites_miel.png', 'grid4x4');
        } else {
            // Personaje sin sprite propio todavía: usa el modelo 3D geométrico.
            playerGroup = Render3D.createGeoCharacter(skinKey);
        }
        Render3D.addCharacterAccessories(playerGroup, skinKey);
        return playerGroup;
    },

    // texturePath: archivo del sprite sheet.
    // layout 'grid4x4': hoja tipo Hello Kitty (4 columnas x 4 filas, fila 1 = camina izq, fila 2 = camina der)
    // layout 'strip4': hoja de una sola fila con 4 cuadros (ej. Kuromi), se voltea horizontalmente según dirección
    createSpriteCharacter: (texturePath = 'sprites_kitty.png', layout = 'grid4x4') => {
        const group = new THREE.Group();
        const texture = textureLoader.load(texturePath);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        // Evita que al cambiar de cuadro (offset/repeat) se filtren colores del
        // cuadro vecino en los bordes — es lo que hacía que la transición de
        // sprites de los demás personajes se viera "sucia" comparada con Kitty.
        texture.generateMipmaps = false;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        if (layout === 'grid4x4') {
            texture.repeat.set(1 / 4, 1 / 4);
            texture.offset.set(0, 0.75);
        } else {
            texture.repeat.set(1 / 4, 1);
            texture.offset.set(0, 0);
        }

        // La hoja de Kitty (224x280 -> celdas de 56x70) no es cuadrada como la del
        // resto de personajes (1024x1024 -> celdas de 256x256). Escalar todo a un
        // sprite cuadrado la deformaba (se veía más "achatada"/ancha de lo que es
        // en el arte original). Se corrige el ancho según la proporción real de
        // cada hoja para que cada quien se vea con sus proporciones nativas.
        const CELL_ASPECT = { 'sprites_kitty.png': 56 / 70 }; // ancho/alto de una celda; el resto ya es 1:1
        const aspect = CELL_ASPECT[texturePath] || 1;

        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, toneMapped: false }) /* colores reales del pixel art */;
        const sprite = new THREE.Sprite(material);
        const baseY = 1.2;
        sprite.scale.set(3.2 * aspect, 3.2, 1);
        sprite.position.y = baseY;
        group.add(sprite);

        group.userData = { texture, sprite, isGeo: false, spriteLayout: layout, spriteBaseY: baseY };
        return group;
    },

    createGeoCharacter: (skinKey) => {
        const DEFS = {
            mymelody: { body: 0xffa4c8, ear: 0xff3b7b, hood: 0xffc1e0, snout: 0xfff0f5, earShape: 'droop' },
            kuromi:   { body: 0x8a8a8a, ear: 0x2b2b2b, hood: 0x2b2b2b, snout: 0xe8e8e8, earShape: 'point' },
            cinnamon: { body: 0xffffff, ear: 0xeaf7fb, hood: null, snout: 0xffffff, earShape: 'wing' },
            purin:    { body: 0xffecb3, ear: 0xd7a86e, hood: null, snout: 0xfff3d6, earShape: 'droop' }
        };
        const def = DEFS[skinKey] || DEFS.mymelody;

        // El "group" raíz es lo que el juego mueve/posiciona (física, colisiones).
        // Todo lo visual vive dentro de "rig", un hijo aparte: así la animación
        // (rebote, squash&stretch, giro al voltear) nunca pelea con la posición
        // que la física le da a "group" en cada frame.
        const group = new THREE.Group();
        const rig = new THREE.Group();
        group.add(rig);

        const bodyMat = new THREE.MeshStandardMaterial({ color: def.body, roughness: 0.35 });
        const earMat = new THREE.MeshStandardMaterial({ color: def.ear, roughness: 0.35 });

        // Cuerpo (proporción chibi, suave)
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 32), bodyMat);
        body.scale.set(1, 0.95, 1);
        body.position.y = 0.1;
        body.castShadow = true;
        rig.add(body);

        // Cabeza
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 32), bodyMat);
        head.position.y = 1.35;
        head.castShadow = true;
        rig.add(head);

        // Hocico claro (le da carita, no solo una bola de color)
        const snoutMat = new THREE.MeshStandardMaterial({ color: def.snout, roughness: 0.45 });
        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 20), snoutMat);
        snout.scale.set(1, 0.78, 0.75);
        snout.position.set(0, 1.18, 0.58);
        rig.add(snout);

        // Naricita
        const noseMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.3 });
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), noseMat);
        nose.position.set(0, 1.28, 0.86);
        rig.add(nose);

        // Ojos grandes y brillantes con reflejo (mucho más bonitos que sin cara)
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.15 });
        const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-1, 1].forEach(side => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), eyeMat);
            eye.position.set(side * 0.26, 1.42, 0.62);
            rig.add(eye);
            const shine = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), shineMat);
            shine.position.set(side * 0.26 + 0.03, 1.46, 0.7);
            rig.add(shine);
        });

        // Mejillas sonrojadas (rosa para todos, celeste para Cinnamoroll)
        const blushColor = skinKey === 'cinnamon' ? 0x90caf9 : 0xff9ec7;
        const blushMat = new THREE.MeshStandardMaterial({ color: blushColor, transparent: true, opacity: 0.55, roughness: 0.6 });
        [-1, 1].forEach(side => {
            const blush = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), blushMat);
            blush.scale.set(1.3, 0.7, 0.4);
            blush.position.set(side * 0.44, 1.18, 0.55);
            rig.add(blush);
        });

        // Orejas orgánicas (ovaladas suaves, ya no son solo esferas planas)
        let earTemplate;
        let earPosY = 2.0, earRotZ = 0.4;
        if (def.earShape === 'point') {
            earTemplate = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.85, 14), earMat);
        } else if (def.earShape === 'wing') {
            // Orejas-ala de Cinnamoroll: largas, aplanadas y casi horizontales
            earTemplate = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), earMat);
            earTemplate.scale.set(1, 2.9, 0.45);
            earPosY = 1.68;
            earRotZ = 1.15;
        } else if (def.earShape === 'droop') {
            earTemplate = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), earMat);
            earTemplate.scale.set(1, 1.9, 0.55);
        } else {
            earTemplate = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), earMat);
            earTemplate.scale.set(1, 1.6, 0.55);
        }
        earTemplate.position.set(-0.5, earPosY, 0.05);
        earTemplate.rotation.z = earRotZ;
        earTemplate.castShadow = true;
        rig.add(earTemplate);

        const earR = earTemplate.clone();
        earR.position.x = 0.5;
        earR.rotation.z = -earRotZ;
        rig.add(earR);

        // BRAZOS (paticas delanteras) — permiten el balanceo al caminar
        const armMat = new THREE.MeshStandardMaterial({ color: def.body, roughness: 0.4 });
        const buildArm = (side) => {
            const armPivot = new THREE.Group();
            armPivot.position.set(side * 0.72, 0.45, 0.05);
            const armMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), armMat);
            armMesh.scale.set(0.85, 1.35, 0.85);
            armMesh.position.y = -0.2;
            armMesh.castShadow = true;
            armPivot.add(armMesh);
            rig.add(armPivot);
            return armPivot;
        };
        const armL = buildArm(-1);
        const armR = buildArm(1);

        // PIERNAS — sin ellas el personaje solo podía flotar/deslizarse; con
        // esto ya se le puede animar un caminado real como el de Kitty.
        const legMat = new THREE.MeshStandardMaterial({ color: def.body, roughness: 0.4 });
        const buildLeg = (side) => {
            const legPivot = new THREE.Group();
            legPivot.position.set(side * 0.36, -0.55, 0.1);
            const legMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), legMat);
            legMesh.scale.set(0.95, 1.05, 0.95);
            legMesh.position.y = -0.15;
            legMesh.castShadow = true;
            legPivot.add(legMesh);
            // patita blanca en la punta (look "calcetín" tierno)
            const paw = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
            paw.scale.set(1, 0.55, 1.1);
            paw.position.set(0, -0.32, 0.05);
            legPivot.add(paw);
            rig.add(legPivot);
            return legPivot;
        };
        const legL = buildLeg(-1);
        const legR = buildLeg(1);

        // Detalles propios de cada personaje
        let tailMesh = null;
        if (skinKey === 'mymelody') {
            const hoodMat = new THREE.MeshStandardMaterial({ color: def.hood, roughness: 0.4 });
            const hood = new THREE.Mesh(new THREE.SphereGeometry(0.76, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2.5), hoodMat);
            hood.position.y = 1.62;
            rig.add(hood);
            // Borde festoneado de la capucha (bolitas alrededor del ruedo, look "petal hood")
            const scallopCount = 10;
            const scallopR = 0.735;
            for (let i = 0; i < scallopCount; i++) {
                const t = i / scallopCount;
                const angle = t * Math.PI * 2;
                // Solo la mitad visible/frontal-baja del ruedo (evita amontonarlas detrás de la cabeza)
                if (Math.cos(angle) < -0.15) continue;
                const scallop = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), hoodMat);
                scallop.position.set(Math.sin(angle) * scallopR, 1.3, Math.cos(angle) * scallopR);
                rig.add(scallop);
            }
            // Colita esponjosa (My Melody es un conejito)
            const tailMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
            tailMesh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 12), tailMat);
            tailMesh.position.set(0, 0.05, -0.78);
            rig.add(tailMesh);
        } else if (skinKey === 'kuromi') {
            const tipMat = new THREE.MeshStandardMaterial({ color: 0xff3b7b, roughness: 0.3 });
            [-0.5, 0.5].forEach(x => {
                const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), tipMat);
                tip.position.set(x, 2.35, 0.05);
                rig.add(tip);
            });
            const skullMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 });
            const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), skullMat);
            skull.position.set(0, 1.75, 0.62);
            rig.add(skull);
            const dotMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
            [-0.05, 0.05].forEach(x => {
                const dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), dotMat);
                dot.position.set(x, 1.76, 0.72);
                rig.add(dot);
            });
            // Colita de diablilla, larga y con puntita en flecha
            const tailPivot = new THREE.Group();
            tailPivot.position.set(0, 0.15, -0.7);
            const tailMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.4 });
            const tailShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 10), tailMat);
            tailShaft.rotation.x = -1.1;
            tailShaft.position.set(0, -0.05, -0.15);
            tailPivot.add(tailShaft);
            const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 10), tailMat);
            tailTip.rotation.x = -1.6;
            tailTip.position.set(0, -0.22, -0.42);
            tailPivot.add(tailTip);
            rig.add(tailPivot);
            tailMesh = tailPivot;
        } else if (skinKey === 'cinnamon') {
            const tailMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
            tailMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), tailMat);
            tailMesh.position.set(0, 0.15, -0.75);
            rig.add(tailMesh);
            // Puntitas celestes en la orilla de cada oreja-ala (siguiendo su nuevo ángulo casi horizontal)
            const tipMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.3 });
            const wingTipOffset = 0.696; // largo efectivo de la oreja-ala desde su centro
            [-1, 1].forEach(side => {
                const tipX = side * (0.5 + Math.sin(earRotZ) * wingTipOffset);
                const tipY = earPosY + Math.cos(earRotZ) * wingTipOffset;
                const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), tipMat);
                tip.position.set(tipX, tipY, 0.05);
                rig.add(tip);
            });
        } else if (skinKey === 'purin') {
            // Parche cafecito en el pecho (su marca registrada)
            const patchMat = new THREE.MeshStandardMaterial({ color: def.ear, roughness: 0.45 });
            const patch = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), patchMat);
            patch.scale.set(1, 1.15, 0.35);
            patch.position.set(0, -0.15, 0.78);
            rig.add(patch);
            // Colita corta y esponjosa
            tailMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), patchMat);
            tailMesh.position.set(0, 0.05, -0.78);
            rig.add(tailMesh);
        }

        group.userData = {
            texture: null, sprite: null, isGeo: true,
            rig, legL, legR, armL, armR, tailMesh,
            earL: earTemplate, earR, earBaseRotZ: earRotZ,
            baseY: rig.position.y
        };
        return group;
    },

    // Accesorios para Personajes
    // Solo aplica a personajes geométricos (isGeo): los sprites ya traen sus
    // accesorios (moño, gorra, etc.) dibujados directamente en el pixel art.
    addCharacterAccessories: (group, skinKey) => {
        if (!group.userData || !group.userData.isGeo) return;
        if (skinKey === 'kitty' || skinKey === 'mymelody') {
            const bowMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.2 });
            const bowY = skinKey === 'mymelody' ? 2.2 : 2.05;
            const bowZ = skinKey === 'mymelody' ? 0.55 : 0.4;
            const center = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), bowMat);
            center.position.set(-0.35, bowY, bowZ);

            const w1 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 12), bowMat);
            w1.rotation.z = Math.PI / 2;
            w1.position.set(-0.55, bowY, bowZ);

            const w2 = w1.clone();
            w2.rotation.z = -Math.PI / 2;
            w2.position.x = -0.15;

            group.add(center, w1, w2);
        } else if (skinKey === 'purin') {
            const hatMat = new THREE.MeshStandardMaterial({ color: 0x4e342e });
            const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 16), hatMat);
            hat.position.set(0, 2.15, 0);
            group.add(hat);
        }
    },

    // Escudo de Habilidad Especial (Ulti)
    createShieldBubble: () => {
        const shieldGeo = new THREE.SphereGeometry(1.35, 24, 24);
        const shieldMat = new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.4,
            roughness: 0.1
        });
        const bubble = new THREE.Mesh(shieldGeo, shieldMat);
        bubble.name = "shieldBubble";
        return bubble;
    },

    // PLATAFORMAS SANRIO DULCES
    createPlatformMesh: (width, height, depth, colorHex) => {
        const group = new THREE.Group();

        const baseMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), baseMat);
        base.receiveShadow = true;
        base.castShadow = true;
        group.add(base);

        // Capa blanca de glaseado / crema
        const topMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const topCap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.35, depth + 0.2), topMat);
        topCap.position.y = height / 2 + 0.15;
        topCap.receiveShadow = true;
        group.add(topCap);

        // Borde de "bolitas de glaseado" a lo largo del frente (efecto pastelería)
        const swirlCount = Math.max(3, Math.floor(width / 1.3));
        for (let i = 0; i < swirlCount; i++) {
            const swirl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), topMat);
            const t = swirlCount > 1 ? i / (swirlCount - 1) : 0.5;
            swirl.position.set(-width / 2 + 0.6 + t * (width - 1.2), height / 2 + 0.32, depth / 2 + 0.05);
            group.add(swirl);
        }

        // Sprinkles de colores encima (más "cute")
        const sprinkleColors = [0xff4081, 0xffd54f, 0x80deea, 0xba68c8, 0xff8a65];
        const sprinkleCount = Math.floor(width * 1.1);
        for (let i = 0; i < sprinkleCount; i++) {
            const c = sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)];
            const sprinkleMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.25 });
            const sprinkle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 6), sprinkleMat);
            sprinkle.rotation.z = Math.random() * Math.PI;
            sprinkle.rotation.x = Math.random() * Math.PI;
            sprinkle.position.set(
                (Math.random() - 0.5) * (width - 0.6),
                height / 2 + 0.35,
                (Math.random() - 0.5) * (depth - 0.6)
            );
            group.add(sprinkle);
        }

        // Moñito decorativo en plataformas grandes
        if (width > 11) {
            const bowMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.2 });
            const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), bowMat);
            const bowX = -width / 2 + 1.0;
            bowCenter.position.set(bowX, height / 2 + 0.5, depth / 2 + 0.05);
            group.add(bowCenter);
            const wingA = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 12), bowMat);
            wingA.rotation.z = Math.PI / 2;
            wingA.position.set(bowX - 0.18, height / 2 + 0.5, depth / 2 + 0.05);
            group.add(wingA);
            const wingB = wingA.clone();
            wingB.rotation.z = -Math.PI / 2;
            wingB.position.x = bowX + 0.18;
            group.add(wingB);
        }

        // Columnas bastón
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 0.4 });
        const pillarLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 18, 16), pillarMat);
        pillarLeft.position.set(-width / 2 + 1.2, -9, 0);
        group.add(pillarLeft);

        if (width > 6) {
            const pillarRight = pillarLeft.clone();
            pillarRight.position.x = width / 2 - 1.2;
            group.add(pillarRight);
        }

        return group;
    },

    // ====================================================
    // --- ENEMIGOS DEMONÍACOS ÉPICOS Y MEJORADOS ---
    // ====================================================

    // 👹 1. DEMONIO TERRESTRE HUMANOIDE (IMP DE FUEGO)
    createEnemyMesh: () => {
        const group = new THREE.Group();
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.35 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x7f0000, roughness: 0.35 });
        const hornMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });

        // Torso
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.0, 16), skinMat);
        torso.position.y = 1.0;
        torso.castShadow = true;
        group.add(torso);

        // Cabeza
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 20), skinMat);
        head.position.y = 1.85;
        head.castShadow = true;
        group.add(head);

        // Cuernos Demoniacos Afilados (en la cabeza)
        const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 14), hornMat);
        hornL.position.set(-0.28, 2.25, 0.05);
        hornL.rotation.z = 0.4;
        hornL.rotation.x = -0.15;
        group.add(hornL);
        const hornR = hornL.clone();
        hornR.position.x = 0.28;
        hornR.rotation.z = -0.4;
        group.add(hornR);

        // Ojos Amarillos glowing
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), eyeMat);
        eyeL.position.set(-0.16, 1.88, 0.36);
        group.add(eyeL);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.16;
        group.add(eyeR);

        // Colmillos
        const fangMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const fangL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), fangMat);
        fangL.rotation.x = Math.PI;
        fangL.position.set(-0.1, 1.68, 0.38);
        group.add(fangL);
        const fangR = fangL.clone();
        fangR.position.x = 0.1;
        group.add(fangR);

        // BRAZOS ARTICULADOS con manos y dedos (humanoide)
        const buildArm = (side) => {
            const armGroup = new THREE.Group();
            const shoulderX = 0.55 * side;

            const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.55, 10), darkMat);
            upperArm.position.set(shoulderX, 1.35, 0);
            upperArm.rotation.z = side * 0.55;
            armGroup.add(upperArm);

            const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.5, 10), skinMat);
            forearm.position.set(shoulderX + side * 0.42, 0.95, 0.22);
            forearm.rotation.z = side * 0.3;
            forearm.rotation.x = -0.7;
            armGroup.add(forearm);

            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), darkMat);
            hand.position.set(shoulderX + side * 0.5, 0.68, 0.48);
            armGroup.add(hand);

            for (let f = -1; f <= 1; f++) {
                const finger = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 6), hornMat);
                finger.position.set(shoulderX + side * 0.5 + f * 0.07, 0.58, 0.6);
                finger.rotation.x = 2.6;
                armGroup.add(finger);
            }
            return armGroup;
        };
        group.add(buildArm(-1));
        group.add(buildArm(1));

        // Piernas con patas garra
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.55, 10), darkMat);
        legL.position.set(-0.22, 0.35, 0);
        group.add(legL);
        const legR = legL.clone(); legR.position.x = 0.22; group.add(legR);
        const footL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 8), hornMat);
        footL.position.set(-0.22, 0.05, 0.1);
        footL.rotation.x = 1.6;
        group.add(footL);
        const footR = footL.clone(); footR.position.x = 0.22; group.add(footR);

        // Cola con Punta de Flecha
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), darkMat);
        tail.position.set(0, 0.75, -0.55);
        tail.rotation.x = -0.8;
        group.add(tail);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 8), darkMat);
        tip.position.set(0, 0.4, -0.95);
        tip.rotation.x = -1.2;
        group.add(tip);

        // Espinas en el lomo
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x2c0000, roughness: 0.3 });
        for (let i = 0; i < 3; i++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 8), spikeMat);
            spike.position.set(0, 1.3 + i * 0.28, -0.42 + i * 0.02);
            spike.rotation.x = -0.5;
            group.add(spike);
        }

        // Núcleo de energía brillante en el pecho
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffab00 });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), coreMat);
        core.position.set(0, 1.1, 0.44);
        group.add(core);

        // Aura de partículas de fuego inferiores
        const flameP = Render3D.createDemonParticles(0xff3d00);
        flameP.position.set(0, 0.5, 0);
        group.add(flameP);

        return group;
    },

    // 🧊 ENEMIGO NUEVO MUNDO 2: GOLEM DE HIELO (tanque, aguanta 2 golpes)
    createGolemEnemyMesh: () => {
        const group = new THREE.Group();
        const iceMat = new THREE.MeshStandardMaterial({ color: 0xe0a82e, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.92 });
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x8d5a00, roughness: 0.4 });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.7), iceMat);
        torso.position.y = 1.05;
        group.add(torso);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), iceMat);
        head.position.y = 1.9;
        group.add(head);

        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff176 });
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), eyeMat);
        eyeL.position.set(-0.14, 1.92, 0.29);
        group.add(eyeL);
        const eyeR = eyeL.clone(); eyeR.position.x = 0.14; group.add(eyeR);

        // Brazos gruesos de hielo
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.32), iceMat);
        armL.position.set(-0.65, 0.95, 0);
        group.add(armL);
        const armR = armL.clone(); armR.position.x = 0.65; group.add(armR);

        // Piernas cortas y anchas
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.35), coreMat);
        legL.position.set(-0.25, 0.3, 0);
        group.add(legL);
        const legR = legL.clone(); legR.position.x = 0.25; group.add(legR);

        // Núcleo brillante en el pecho (grieta de energía)
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffc107 }));
        core.position.set(0, 1.1, 0.38);
        group.add(core);

        // Cristales puntiagudos en los hombros
        const crystalMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.1, metalness: 0.3 });
        [-0.6, 0.6].forEach(sx => {
            const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 6), crystalMat);
            crystal.position.set(sx, 1.55, 0);
            crystal.rotation.z = sx > 0 ? -0.3 : 0.3;
            group.add(crystal);
        });

        return group;
    },

    // 👻 ENEMIGO NUEVO MUNDO 3: FANTASMA ERRÁTICO NOCTURNO
    createGhostEnemyMesh: () => {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xce93d8, transparent: true, opacity: 0.75, roughness: 0.3, emissive: 0x7b1fa2, emissiveIntensity: 0.3 });

        const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65), bodyMat);
        group.add(body);

        // Cola ondulada tipo fantasma (varios lóbulos)
        for (let i = 0; i < 4; i++) {
            const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), bodyMat);
            lobe.position.set(-0.4 + i * 0.27, -0.35, 0);
            group.add(lobe);
        }

        // Ojos brillantes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), eyeMat);
        eyeL.position.set(-0.17, 0.08, 0.48);
        group.add(eyeL);
        const eyeR = eyeL.clone(); eyeR.position.x = 0.17; group.add(eyeR);

        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x4a148c });
        const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), pupilMat);
        pupilL.position.set(-0.17, 0.08, 0.55);
        group.add(pupilL);
        const pupilR = pupilL.clone(); pupilR.position.x = 0.17; group.add(pupilR);

        return group;
    },

    // 💰 COFRE SECRETO (opcional, da puntos extra)
    createChestMesh: () => {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.7 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.25, emissive: 0xffab00, emissiveIntensity: 0.3 });

        const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.55), woodMat);
        base.position.y = 0.25;
        group.add(base);

        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.55, 12, 1, false, 0, Math.PI), woodMat);
        lid.rotation.z = Math.PI / 2;
        lid.position.y = 0.5;
        group.add(lid);

        const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.6), goldMat);
        band1.position.y = 0.25;
        group.add(band1);
        const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.6), goldMat);
        band2.position.y = 0.5;
        group.add(band2);

        const lock = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), goldMat);
        lock.position.set(0, 0.35, 0.29);
        group.add(lock);

        // Brillo/destello encima
        const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0.8 });
        const sparkle = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), sparkleMat);
        sparkle.position.y = 0.95;
        sparkle.name = 'chestSparkle';
        group.add(sparkle);

        group.name = 'secretChest';
        return group;
    },

    // 🗿 2. GÁRGOLA DE PIEDRA VOLADORA
    createFlyingEnemyMesh: () => {
        const group = new THREE.Group();

        // Cuerpo de Piedra Tallada (bajo poligonaje, aspecto rocoso)
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.95, flatShading: true });
        const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), bodyMat);
        body.castShadow = true;
        group.add(body);

        // Parches de musgo (le dan vida de piedra antigua)
        const mossMat = new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.9 });
        const moss1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mossMat);
        moss1.scale.set(1, 0.4, 1);
        moss1.position.set(-0.35, 0.55, 0.35);
        group.add(moss1);
        const moss2 = moss1.clone();
        moss2.scale.set(0.8, 0.35, 0.8);
        moss2.position.set(0.4, -0.3, -0.4);
        group.add(moss2);

        // Cuernos de Piedra
        const hornMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.7 });
        const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 8), hornMat);
        hornL.position.set(-0.35, 0.75, 0);
        hornL.rotation.z = 0.4;
        group.add(hornL);

        const hornR = hornL.clone();
        hornR.position.x = 0.35;
        hornR.rotation.z = -0.4;
        group.add(hornR);

        // Alas de Piedra Desplegadas
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.85, side: THREE.DoubleSide, flatShading: true });
        const wingL = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), wingMat);
        wingL.position.set(-1.1, 0.2, 0);
        wingL.rotation.y = 0.4;
        group.add(wingL);

        const wingR = wingL.clone();
        wingR.position.x = 1.1;
        wingR.rotation.y = -0.4;
        group.add(wingR);

        // Ojos Rojos Brillantes (contraste con la piedra gris)
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff5252 });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), eyeMat);
        eyeL.position.set(-0.25, 0.2, 0.65);
        group.add(eyeL);

        const eyeR = eyeL.clone();
        eyeR.position.x = 0.25;
        group.add(eyeR);

        // Brazos pequeños con manos de garra (aspecto humanoide)
        const gArmMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.85 });
        const buildGargArm = (side) => {
            const armGroup = new THREE.Group();
            const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.4, 8), gArmMat);
            upperArm.position.set(0.55 * side, 0.1, 0.1);
            upperArm.rotation.z = side * 0.7;
            armGroup.add(upperArm);
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), gArmMat);
            hand.position.set(0.78 * side, -0.15, 0.25);
            armGroup.add(hand);
            for (let f = -1; f <= 1; f += 2) {
                const finger = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.13, 6), gClawMatShared);
                finger.position.set(0.78 * side + f * 0.05, -0.24, 0.32);
                finger.rotation.x = 2.6;
                armGroup.add(finger);
            }
            return armGroup;
        };
        const gClawMatShared = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.5 });
        group.add(buildGargArm(-1));
        group.add(buildGargArm(1));

        // Patas colgantes con garras
        const gargLimbMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.85 });
        const gLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.5, 8), gargLimbMat);
        gLegL.position.set(-0.25, -0.85, 0);
        group.add(gLegL);
        const gLegR = gLegL.clone(); gLegR.position.x = 0.25; group.add(gLegR);

        const gClawMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.5 });
        const gClawL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 8), gClawMat);
        gClawL.position.set(-0.25, -1.15, 0.05);
        gClawL.rotation.x = Math.PI;
        group.add(gClawL);
        const gClawR = gClawL.clone(); gClawR.position.x = 0.25; group.add(gClawR);

        // Cola con punta de flecha
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), gargLimbMat);
        tail.position.set(0, -0.3, -0.65);
        tail.rotation.x = 1.0;
        group.add(tail);
        const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 8), gClawMat);
        tailTip.position.set(0, -0.6, -1.05);
        tailTip.rotation.x = 2.4;
        group.add(tailTip);

        // Garras en la punta de las alas
        const wingClawL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), gClawMat);
        wingClawL.position.set(-1.7, 0.5, 0);
        wingClawL.rotation.z = 1.0;
        group.add(wingClawL);
        const wingClawR = wingClawL.clone(); wingClawR.position.x = 1.7; wingClawR.rotation.z = -1.0; group.add(wingClawR);

        // Polvo de piedra flotando alrededor
        const dustP = Render3D.createDemonParticles(0xcfd8dc);
        group.add(dustP);

        return group;
    },

    // 🗿👹 3. JEFE FINAL: GOLEM DE PIEDRA Y LAVA (ÉPICO)
    createBossMesh: () => {
        const group = new THREE.Group();

        // Cuerpo Gigante de Piedra (Golem) — cúmulo de rocas redondeadas, no un sólido geométrico
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6d5f52, roughness: 0.95 });
        const boulders = [
            [0, 0, 0, 2.0], [0.95, 0.55, 0.5, 1.15], [-0.95, 0.5, -0.4, 1.2],
            [0.55, -0.9, 0.55, 1.05], [-0.6, -0.85, -0.5, 1.1], [0, 1.05, -0.65, 1.05],
            [0.3, 0.3, 1.1, 0.85], [-0.3, -0.2, 1.15, 0.8]
        ];
        boulders.forEach(([x, y, z, r]) => {
            const boulder = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 14), bodyMat);
            boulder.position.set(x, y, z);
            boulder.castShadow = true;
            group.add(boulder);
        });

        // Grietas de lava brillante sobre el torso de piedra
        const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
        const lavaCracks = [
            [-0.9, 0.9, 1.4, 0.5], [0.7, 0.3, 1.6, 0.35], [-0.3, -0.7, 1.7, 0.45], [1.0, -0.9, 1.3, 0.3]
        ];
        lavaCracks.forEach(([x, y, z, len]) => {
            const crack = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 6), lavaMat);
            crack.position.set(x, y, z);
            crack.rotation.z = Math.random() * Math.PI;
            crack.rotation.x = 0.3;
            group.add(crack);
        });

        // Cuernos Gigantes de Piedra
        const hornMat = new THREE.MeshStandardMaterial({ color: 0x3e3630, roughness: 0.8 });
        const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 8), hornMat);
        hornL.position.set(-1.4, 2.3, 0.2);
        hornL.rotation.z = 0.5;
        hornL.rotation.x = -0.3;
        group.add(hornL);

        const hornR = hornL.clone();
        hornR.position.x = 1.4;
        hornR.rotation.z = -0.5;
        group.add(hornR);

        // Placas de piedra en la espalda (a modo de alas rocosas)
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x5a4d42, roughness: 0.95, side: THREE.DoubleSide, flatShading: true });
        const wingL = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.3), wingMat);
        wingL.position.set(-2.8, 0.8, -0.8);
        wingL.rotation.y = 0.5;
        group.add(wingL);

        const wingR = wingL.clone();
        wingR.position.x = 2.8;
        wingR.rotation.y = -0.5;
        group.add(wingR);

        // Ojos Dorados Glowing
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffd600 });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), eyeMat);
        eyeL.position.set(-0.75, 0.6, 1.8);
        group.add(eyeL);

        const eyeR = eyeL.clone();
        eyeR.position.x = 0.75;
        group.add(eyeR);

        // Corona de Lava Superior (energía del núcleo escapando por la cabeza)
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.3, 10), flameMat);
        flame.position.set(0, 2.65, 0);
        group.add(flame);

        // Corona secundaria de picos de piedra
        const crownMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.85 });
        for (let i = 0; i < 5; i++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 8), crownMat);
            const ang = (i / 4 - 0.5) * 1.4;
            spike.position.set(Math.sin(ang) * 1.4, 1.9 + Math.cos(ang) * 0.3, Math.cos(ang) * 0.6);
            spike.rotation.z = ang;
            group.add(spike);
        }

        // Brazos gigantes de piedra articulados con manos
        const bigArmMat = new THREE.MeshStandardMaterial({ color: 0x574b3f, roughness: 0.9 });
        const bigClawMat = new THREE.MeshStandardMaterial({ color: 0x2e2620, roughness: 0.7 });
        const buildBossArm = (side) => {
            const armGroup = new THREE.Group();

            const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 1.0, 8), bigArmMat);
            upperArm.position.set(1.7 * side, 0.4, 0.1);
            upperArm.rotation.z = side * 0.5;
            armGroup.add(upperArm);

            const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 14), bigArmMat);
            elbow.position.set(2.3 * side, -0.3, 0.3);
            armGroup.add(elbow);

            const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.8, 8), bigArmMat);
            forearm.position.set(2.55 * side, -0.85, 0.55);
            forearm.rotation.z = side * -0.35;
            forearm.rotation.x = 0.6;
            armGroup.add(forearm);

            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 14), bigArmMat);
            hand.position.set(2.7 * side, -1.35, 0.85);
            armGroup.add(hand);

            for (let i = -1; i <= 1; i++) {
                const claw = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.5, 7), bigClawMat);
                claw.position.set(2.7 * side + i * 0.22, -1.7, 1.05);
                claw.rotation.x = Math.PI;
                armGroup.add(claw);
            }
            return armGroup;
        };
        group.add(buildBossArm(-1));
        group.add(buildBossArm(1));

        // Piernas gigantes de piedra
        const bigLegMat = new THREE.MeshStandardMaterial({ color: 0x453b32, roughness: 0.9 });
        const bigLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 1.0, 8), bigLegMat);
        bigLegL.position.set(-0.9, -2.2, 0);
        group.add(bigLegL);
        const bigLegR = bigLegL.clone(); bigLegR.position.x = 0.9; group.add(bigLegR);

        // Núcleo de lava brillante en el pecho (corazón del golem)
        const coreMat2 = new THREE.MeshBasicMaterial({ color: 0xff1744 });
        const core2 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), coreMat2);
        core2.position.set(0, 0.2, 2.0);
        group.add(core2);

        // Partículas de ceniza y lava del Jefe
        const bossP = Render3D.createDemonParticles(0xff5722);
        bossP.scale.set(2, 2, 2);
        group.add(bossP);

        return group;
    },

    // Sistema de Partículas Demoníacas
    createDemonParticles: (colorHex) => {
        const count = 15;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        for(let i = 0; i < count * 3; i++) {
            pos[i] = (Math.random() - 0.5) * 1.6;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: colorHex, size: 0.22, transparent: true, opacity: 0.8 });
        return new THREE.Points(geo, mat);
    },

    // BLOQUE DE HIELO PARA ENEMIGOS CONGELADOS
    createIceBlock: () => {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x80deea,
            transparent: true,
            opacity: 0.75,
            roughness: 0.1,
            metalness: 0.1
        });
        const ice = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.5, 2.2), mat);
        ice.name = "iceBlock";
        return ice;
    },

    // PELIGRO: POZO DE LAVA (llena el hueco entre plataformas, con capas de fuego bien visibles)
    createLavaMesh: (width) => {
        const group = new THREE.Group();
        const w = Math.max(width, 2);

        // Fondo oscuro del pozo (da sensación de profundidad)
        const pitMat = new THREE.MeshStandardMaterial({ color: 0x3e0d02, roughness: 0.9 });
        const pit = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, 5.5), pitMat);
        pit.position.y = -0.8;
        group.add(pit);

        // Capa de lava brillante (emissive fuerte, muy distinta al color de las plataformas)
        const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff5722, emissive: 0xff9100, emissiveIntensity: 1.1, roughness: 0.35 });
        const pool = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, 5.6), lavaMat);
        pool.position.y = 0.15;
        pool.name = 'lavaSurface';
        group.add(pool);

        // Llamas puntiagudas asomando de la superficie
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xffca28 });
        const flameCount = Math.max(3, Math.floor(w / 1.3));
        for (let i = 0; i < flameCount; i++) {
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55 + Math.random() * 0.3, 6), flameMat);
            flame.position.set(-w / 2 + (i + 0.5) * (w / flameCount), 0.55, (Math.random() - 0.5) * 4);
            flame.name = 'lavaFlame';
            group.add(flame);
        }

        // Brasas/burbujas flotando
        const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffe082 });
        for (let i = 0; i < 5; i++) {
            const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.1, 8, 8), bubbleMat);
            bubble.position.set((Math.random() - 0.5) * w * 0.85, 0.4 + Math.random() * 0.5, (Math.random() - 0.5) * 4);
            bubble.name = 'lavaEmber';
            group.add(bubble);
        }

        group.userData.isLavaHazard = true;
        return group;
    },

    // PELIGRO: FILA DE PICOS (llena el hueco entre plataformas, o se coloca sobre una plataforma)
    createSpikeMesh: (width) => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x616161, metalness: 0.6, roughness: 0.3 });
        const count = Math.max(2, Math.floor(width / 0.9));
        for (let i = 0; i < count; i++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 6), mat);
            spike.position.set(-width / 2 + (i + 0.5) * (width / count), 0.3, 0);
            group.add(spike);
        }
        return group;
    },

    // DECORACIONES DE PLATAFORMA SANRIO
    createProp: (type) => {
        const group = new THREE.Group();

        if (type === 'flower') {
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8), new THREE.MeshStandardMaterial({ color: 0x81c784 }));
            stem.position.y = 0.4;
            group.add(stem);

            const petalMat = new THREE.MeshStandardMaterial({ color: 0xff80ab });
            for (let i = 0; i < 5; i++) {
                const petal = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), petalMat);
                const angle = (i / 5) * Math.PI * 2;
                petal.position.set(Math.cos(angle) * 0.25, 0.8, Math.sin(angle) * 0.25);
                group.add(petal);
            }
            const center = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffeb3b }));
            center.position.y = 0.8;
            group.add(center);

        } else if (type === 'mushroom') {
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.7, 16), new THREE.MeshStandardMaterial({ color: 0xfff8e1 }));
            stem.position.y = 0.35;
            group.add(stem);

            const cap = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xff4081, roughness: 0.2 }));
            cap.position.y = 0.7;
            group.add(cap);

        } else if (type === 'bush') {
            const mat = new THREE.MeshStandardMaterial({ color: 0xf8bbd0, roughness: 0.6 });
            const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), mat);
            b1.position.y = 0.4;
            const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), mat);
            b2.position.set(0.4, 0.3, 0);
            group.add(b1, b2);

        } else if (type === 'candycane') {
            const stripeA = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 });
            const stripeB = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.15 });
            const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.3, 12), stripeA);
            stick.position.y = 0.65;
            group.add(stick);
            for (let i = 0; i < 5; i++) {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.045, 8, 16), stripeB);
                ring.position.y = 0.25 + i * 0.24;
                ring.rotation.x = Math.PI / 2.3;
                group.add(ring);
            }
            const hook = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.11, 10, 20, Math.PI), stripeA);
            hook.position.set(0, 1.32, 0);
            hook.rotation.z = Math.PI / 2;
            group.add(hook);

        } else if (type === 'lollipop') {
            const stickMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
            const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.75, 8), stickMat);
            stick.position.y = 0.38;
            group.add(stick);

            const swirlColors = [0xff4081, 0xffd54f, 0x80deea, 0xba68c8];
            const candyColor = swirlColors[Math.floor(Math.random() * swirlColors.length)];
            const candyMat = new THREE.MeshStandardMaterial({ color: candyColor, roughness: 0.15 });
            const candy = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 24), candyMat);
            candy.position.y = 0.85;
            candy.rotation.x = Math.PI / 2;
            group.add(candy);

            const swirlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 });
            const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 24), swirlMat);
            swirl.position.set(0, 0.85, 0.075);
            group.add(swirl);

        } else if (type === 'gumdrop') {
            const gumColors = [0xff80ab, 0xffd54f, 0x80deea, 0xba68c8, 0xff8a65];
            const gumMat = new THREE.MeshStandardMaterial({ color: gumColors[Math.floor(Math.random() * gumColors.length)], roughness: 0.2 });
            const drop = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7), gumMat);
            drop.position.y = 0.3;
            group.add(drop);

        } else if (type === 'applekitty') {
            // La icónica manzanita roja de Hello Kitty
            const appleMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.2 });
            const apple = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 20), appleMat);
            apple.position.y = 0.45;
            apple.scale.set(1, 1.1, 1);
            group.add(apple);

            const dentMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.2 });
            const dent = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), dentMat);
            dent.position.set(0, 0.82, 0.1);
            group.add(dent);

            const stemMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), stemMat);
            stem.position.set(0, 0.9, 0);
            stem.rotation.z = 0.3;
            group.add(stem);

            const leafMat = new THREE.MeshStandardMaterial({ color: 0x66bb6a, roughness: 0.3 });
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), leafMat);
            leaf.scale.set(1.4, 0.4, 0.8);
            leaf.position.set(0.16, 0.95, 0);
            leaf.rotation.z = 0.4;
            group.add(leaf);
        }

        return group;
    },

    createCoinMesh: () => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.2 });
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 20), mat);
        coin.rotation.x = Math.PI / 2;
        group.add(coin);
        return group;
    },

    // BOLA DE FUEGO DEL JEFE (ataque desde el cielo)
    createFireballMesh: () => {
        const group = new THREE.Group();
        const mat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 14), mat);
        group.add(core);

        const glowMat = new THREE.MeshBasicMaterial({ color: 0xffab40, transparent: true, opacity: 0.4 });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 14), glowMat);
        group.add(glow);

        const trail = Render3D.createDemonParticles(0xffab40);
        trail.scale.set(0.7, 0.7, 0.7);
        group.add(trail);

        return group;
    },

    // CÍRCULO DE ADVERTENCIA DE IMPACTO (colorHex opcional para dar aviso temático por ataque)
    createWarningRing: (radius = 2.0, colorHex = 0xff1744) => {
        const group = new THREE.Group();
        const discMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
        const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), discMat);
        disc.rotation.x = -Math.PI / 2;
        group.add(disc);

        const outlineMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
        const outline = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.06, 8, 32), outlineMat);
        outline.rotation.x = -Math.PI / 2;
        group.add(outline);

        return group;
    },

    // ATAQUE DE JEFE (Valle Dorado): PICO DE HIELO QUE ERUPCIONA DEL SUELO
    createIceSpikeMesh: () => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffca28, transparent: true, opacity: 0.95,
            roughness: 0.2, metalness: 0.5, emissive: 0xff8f00, emissiveIntensity: 0.35
        });
        const spikes = [[0, 0, 0, 0.42, 1.7], [0.32, 0, -0.12, 0.24, 1.15], [-0.3, 0, 0.16, 0.22, 1.25], [0.1, 0, 0.32, 0.18, 0.85]];
        spikes.forEach(([x, y, z, r, h]) => {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mat);
            spike.position.set(x, y + h / 2, z);
            group.add(spike);
        });
        return group;
    },

    // ATAQUE DE JEFE (Castillo Dulce): ORBE SOMBRA QUE PERSIGUE AL JUGADOR
    createShadowOrbMesh: () => {
        const group = new THREE.Group();
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x7e57c2 });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 14), coreMat);
        group.add(core);

        const glowMat = new THREE.MeshBasicMaterial({ color: 0xb388ff, transparent: true, opacity: 0.4 });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.68, 14, 14), glowMat);
        group.add(glow);

        const trail = Render3D.createDemonParticles(0xb388ff);
        trail.scale.set(0.6, 0.6, 0.6);
        group.add(trail);

        return group;
    },

    // ESTALLIDO VISUAL DE HABILIDAD ESPECIAL: anillo + resplandor que se expande y se desvanece.
    // Se usa para darle impacto a las ultis de cada personaje (antes eran invisibles).
    createAbilityBurstMesh: (colorHex) => {
        const group = new THREE.Group();

        const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.9, 32), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.name = 'burstRing';
        group.add(ring);

        const glowMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.28 });
        const glow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), glowMat);
        glow.rotation.x = -Math.PI / 2;
        glow.name = 'burstGlow';
        group.add(glow);

        const sparkles = Render3D.createDemonParticles(colorHex);
        sparkles.scale.set(1.4, 1.4, 1.4);
        sparkles.name = 'burstSparkles';
        group.add(sparkles);

        return group;
    },

    // --- FONDO MUNDO SANRIO / HELLO KITTY ---
    _createDecorBase: (scene, levelWidth, theme = 'garden', opts = {}) => {
        const useTrees = opts.trees !== false, useForest = opts.forest !== false, useMushrooms = opts.mushrooms !== false;
        const group = new THREE.Group();
        group.userData.theme = theme;

        const THEMES = {
            garden: { hill1: 0xc9ecc4, hill2: 0xfbc9dd, sun: 0xfff1b8, sunGlow: 0xffc8de, tree: 0xffb7d5, cloud: 0xffffff },
            golden: { hill1: 0xf6d58a, hill2: 0xe8ac4a, sun: 0xfff3c4, sunGlow: 0xffd54f, tree: 0xffca28, cloud: 0xfff3e0 },
            night: { hill1: 0x4a148c, hill2: 0x2a1454, sun: 0xe1f5fe, sunGlow: 0x7e57c2, tree: 0x7e57c2, cloud: 0xd1c4e9 }
        };
        const th = THEMES[theme] || THEMES.garden;

        // Toque de luz propio por mundo, para que Valle Dorado y Castillo
        // Dulce no se sientan iluminados exactamente igual que el Jardín.
        if (theme === 'golden') {
            const snowLight = new THREE.PointLight(0xffe0a3, 0.75, 90);
            snowLight.position.set(0, 20, 10);
            group.add(snowLight);
        } else if (theme === 'night') {
            const moonLight = new THREE.PointLight(0x9575cd, 0.6, 100);
            moonLight.position.set(0, 25, 5);
            group.add(moonLight);
            const rimGlow = new THREE.PointLight(0x4a148c, 0.4, 60);
            rimGlow.position.set(0, 5, 15);
            group.add(rimGlow);
        }

        const hillMat1 = new THREE.MeshStandardMaterial({ color: th.hill1, roughness: 0.8 });
        const hillMat2 = new THREE.MeshStandardMaterial({ color: th.hill2, roughness: 0.8 });

        // Sol/Luna gigante en el horizonte (luna en el mundo nocturno)
        const sunMat = new THREE.MeshBasicMaterial({ color: th.sun });
        const sun = new THREE.Mesh(new THREE.SphereGeometry(theme === 'night' ? 7 : 9, 24, 24), sunMat);
        sun.position.set(levelWidth * 0.5, 14, -55);
        group.add(sun);
        const sunGlowMat = new THREE.MeshBasicMaterial({ color: th.sunGlow, transparent: true, opacity: 0.35 });
        const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(theme === 'night' ? 10 : 13, 24, 24), sunGlowMat);
        sunGlow.position.copy(sun.position);
        group.add(sunGlow);

        const count = Math.ceil(levelWidth / 22);
        for (let i = 0; i < count; i++) {
            const hill1 = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 16), hillMat1);
            hill1.position.set(i * 22 - 10, -9, -20);
            hill1.scale.set(1.5, 0.8, 1);
            group.add(hill1);

            const hill2 = new THREE.Mesh(new THREE.SphereGeometry(18, 32, 16), hillMat2);
            hill2.position.set(i * 22 + 8, -11, -34);
            hill2.scale.set(1.7, 0.9, 1);
            group.add(hill2);

            // Árboles (color según el tema: sakura rosa, nevados, o silueta nocturna)
            if (useTrees) {
                const sakuraTree = Render3D.createSakuraTree(th.tree);
                sakuraTree.position.set(i * 22 + (Math.random() * 6 - 3), 1, -16);
                group.add(sakuraTree);
            }
        }

        // SEGUNDA CAPA DE BOSQUE: pinos densos y coloridos más cerca de la cámara, con toque mágico (degradado + brillo)
        const pinePalettes = theme === 'night'
            ? [[0x7e57c2, 0x9575cd, 0xb39ddb], [0x5c6bc0, 0x7986cb, 0x9fa8da], [0xba68c8, 0xce93d8, 0xe1bee7]]
            : theme === 'golden'
            ? [[0x4db6ac, 0x80cbc4, 0xb2dfdb], [0x64b5f6, 0x90caf9, 0xbbdefb], [0x81c784, 0xa5d6a7, 0xc8e6c9]]
            : [[0x66bb6a, 0x81c784, 0xa5d6a7], [0xff8a65, 0xffab91, 0xffccbc], [0xba68c8, 0xce93d8, 0xf3e5f5]];
        const pineCount = Math.ceil(levelWidth / 5.5);
        for (let i = 0; useForest && i < pineCount; i++) {
            const palette = pinePalettes[Math.floor(Math.random() * pinePalettes.length)];
            const isMagic = Math.random() < 0.35;
            const pine = Render3D.createPineTree(palette, isMagic);
            const scale = 0.55 + Math.random() * 0.8;
            pine.scale.set(scale, scale, scale);
            pine.position.set(Math.random() * (levelWidth + 30) - 15, -0.5 + Math.random() * 0.8, -8 - Math.random() * 7);
            if (isMagic) pine.userData = { isMagicTree: true, twinkleOffset: Math.random() * Math.PI * 2 };
            group.add(pine);
        }

        // Hongos gigantes de cuento de hadas, esparcidos entre los árboles
        const mushroomColors = theme === 'night' ? [0x9575cd, 0xba68c8] : theme === 'golden' ? [0x4fc3f7, 0xff8a65] : [0xff5252, 0xffca28, 0xff80ab];
        const mushroomCount = Math.ceil(levelWidth / 16);
        for (let i = 0; useMushrooms && i < mushroomCount; i++) {
            const mush = Render3D.createGiantMushroom(mushroomColors[Math.floor(Math.random() * mushroomColors.length)]);
            const scale = 0.8 + Math.random() * 0.9;
            mush.scale.set(scale, scale, scale);
            mush.position.set(Math.random() * (levelWidth + 30) - 15, -0.3, -6 - Math.random() * 4);
            group.add(mush);
        }

        // FAUNA AMBIENTAL: le da vida real al bosque (revolotean solas, decorativas)
        if (theme === 'garden') {
            const butterflyColors = [0xff80ab, 0xfff176, 0x80deea, 0xba68c8];
            const bfCount = Math.ceil(levelWidth / 9);
            for (let i = 0; i < bfCount; i++) {
                const bf = Render3D.createButterfly(butterflyColors[Math.floor(Math.random() * butterflyColors.length)]);
                const baseY = 3 + Math.random() * 6;
                bf.position.set(Math.random() * (levelWidth + 20) - 10, baseY, -3 - Math.random() * 5);
                bf.userData = { isButterfly: true, baseX: bf.position.x, baseY, roamSpeed: 0.4 + Math.random() * 0.5, roamOffset: Math.random() * Math.PI * 2, flapSpeed: 8 + Math.random() * 4 };
                group.add(bf);
            }
        } else if (theme === 'golden') {
            const birdColors = [0xff7043, 0xffca28, 0xef5350];
            const birdCount = Math.ceil(levelWidth / 14);
            for (let i = 0; i < birdCount; i++) {
                const bird = Render3D.createBird(birdColors[Math.floor(Math.random() * birdColors.length)]);
                const baseY = 8 + Math.random() * 8;
                bird.position.set(Math.random() * (levelWidth + 20) - 10, baseY, -6 - Math.random() * 6);
                bird.userData = { isBird: true, baseX: bird.position.x, baseY, roamSpeed: 0.5 + Math.random() * 0.4, roamOffset: Math.random() * Math.PI * 2, flapSpeed: 10 + Math.random() * 4 };
                group.add(bird);
            }
        } else if (theme === 'night') {
            const ffCount = Math.ceil(levelWidth / 6);
            for (let i = 0; i < ffCount; i++) {
                const ff = Render3D.createFirefly();
                const baseY = 1.5 + Math.random() * 4;
                ff.position.set(Math.random() * (levelWidth + 20) - 10, baseY, -3 - Math.random() * 6);
                ff.userData = { isFirefly: true, baseX: ff.position.x, baseY, roamSpeed: 0.3 + Math.random() * 0.4, roamOffset: Math.random() * Math.PI * 2 };
                group.add(ff);
            }
        }

        // Nubes con Silueta de Hello Kitty
        const cloudMat = new THREE.MeshStandardMaterial({ color: th.cloud, transparent: true, opacity: theme === 'night' ? 0.5 : 0.9 });
        for (let i = 0; i < count * 2; i++) {
            const kittyCloud = new THREE.Group();
            
            const c1 = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 16), cloudMat);
            const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), cloudMat);
            c2.position.set(1.8, -0.2, 0);
            const c3 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), cloudMat);
            c3.position.set(-1.8, -0.3, 0);
            kittyCloud.add(c1, c2, c3);

            const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 12), cloudMat);
            ear1.position.set(-1.1, 2.2, 0);
            ear1.rotation.z = 0.2;
            const ear2 = ear1.clone();
            ear2.position.x = 1.1;
            ear2.rotation.z = -0.2;
            kittyCloud.add(ear1, ear2);

            kittyCloud.position.set(i * 12 - 10, 11 + Math.random() * 7, -26 - Math.random() * 10);
            group.add(kittyCloud);
        }

        // Corazones y estrellas flotantes de colores (más vida y alegría)
        const heartColors = theme === 'night' ? [0xba68c8, 0x7e57c2, 0xffffff, 0xd1c4e9] : theme === 'golden' ? [0xffd54f, 0xffb300, 0xfff59d, 0xffffff] : [0xff1744, 0xff4081, 0xba68c8, 0xff80ab, 0xf06292];
        const starColors = theme === 'night' ? [0xffffff, 0xfff9c4, 0xe1f5fe] : [0xffd54f, 0xfff176, 0xffffff, 0xff80ab, 0x80deea];
        const decorCount = Math.ceil(levelWidth / 7);
        for (let i = 0; i < decorCount; i++) {
            const isHeart = theme === 'night' ? Math.random() > 0.75 : Math.random() > 0.45;
            const color = isHeart
                ? heartColors[Math.floor(Math.random() * heartColors.length)]
                : starColors[Math.floor(Math.random() * starColors.length)];
            const deco = isHeart ? Render3D.createHeartMesh(color) : Render3D.createStarMesh(color);

            const scale = 0.6 + Math.random() * 1.0;
            deco.scale.set(scale, scale, scale);

            const baseY = 6 + Math.random() * 15;
            deco.position.set(
                Math.random() * (levelWidth + 30) - 15,
                baseY,
                -10 - Math.random() * 24
            );

            deco.userData = {
                isFloatDecor: true,
                baseY,
                floatSpeed: 0.4 + Math.random() * 0.7,
                floatOffset: Math.random() * Math.PI * 2,
                floatAmp: 0.6 + Math.random() * 0.9
            };
            group.add(deco);
        }

        // Nieve cayendo (solo tema 'snow')
        if (theme === 'golden') {
            const snowMat = new THREE.MeshBasicMaterial({ color: 0xffe082, transparent: true, opacity: 0.9 }); // polen / hojas doradas
            const snowCount = Math.ceil(levelWidth / 3);
            for (let i = 0; i < snowCount; i++) {
                const flake = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 6, 6), snowMat);
                const startY = Math.random() * 22;
                flake.position.set(Math.random() * (levelWidth + 30) - 15, startY, -5 - Math.random() * 20);
                flake.userData = { isSnowflake: true, baseY: startY, fallSpeed: 0.6 + Math.random() * 0.8, driftOffset: Math.random() * Math.PI * 2 };
                group.add(flake);
            }
        }

        // Estrellas titilantes (solo tema 'night')
        if (theme === 'night') {
            const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const twinkleCount = Math.ceil(levelWidth / 2.5);
            for (let i = 0; i < twinkleCount; i++) {
                const tstar = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), starMat);
                tstar.position.set(Math.random() * (levelWidth + 30) - 15, 8 + Math.random() * 20, -30 - Math.random() * 25);
                tstar.userData = { isTwinkleStar: true, twinkleOffset: Math.random() * Math.PI * 2 };
                group.add(tstar);
            }
        }

        scene.add(group);
        return group;
    },

    // 🌲 PINO DE BOSQUE (denso, para el primer plano - da sensación de bosque real)
    createPineTree: (color = 0x2e7d32, magic = false) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.32, 2.2, 8),
            new THREE.MeshStandardMaterial({ color: magic ? 0x8d6e63 : 0x6d4c41 })
        );
        trunk.position.y = 1.1;
        tree.add(trunk);

        // Si color es un array, cada nivel del árbol usa un color distinto (efecto degradado mágico)
        const colors = Array.isArray(color) ? color : [color, color, color];
        const tiers = [
            { y: 2.3, r: 1.5, h: 1.6 },
            { y: 3.3, r: 1.15, h: 1.4 },
            { y: 4.15, r: 0.75, h: 1.2 }
        ];
        tiers.forEach((t, i) => {
            const mat = new THREE.MeshStandardMaterial({
                color: colors[i % colors.length], roughness: 0.65, flatShading: true,
                emissive: magic ? colors[i % colors.length] : 0x000000, emissiveIntensity: magic ? 0.18 : 0
            });
            const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 8), mat);
            cone.position.y = t.y;
            tree.add(cone);
        });

        // Árbol mágico: brillo/estrellita en la punta, como un árbol encantado
        if (magic) {
            const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff59d });
            const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), glowMat);
            glow.position.y = 4.95;
            glow.name = 'magicGlow';
            tree.add(glow);
            const haloMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4, transparent: true, opacity: 0.4 });
            const halo = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), haloMat);
            halo.position.y = 4.95;
            halo.name = 'magicHalo';
            tree.add(halo);
        }

        return tree;
    },

    // 🍄 HONGO GIGANTE DE BOSQUE MÁGICO (decorativo, le da toque de cuento de hadas)
    createGiantMushroom: (capColor = 0xff5252) => {
        const group = new THREE.Group();
        const stemMat = new THREE.MeshStandardMaterial({ color: 0xfff3e0, roughness: 0.6 });
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 1.1, 10), stemMat);
        stem.position.y = 0.55;
        group.add(stem);

        const capMat = new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.5 });
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), capMat);
        cap.position.y = 1.15;
        group.add(cap);

        const dotMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
        for (let i = 0; i < 5; i++) {
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09 + Math.random() * 0.05, 8, 8), dotMat);
            const ang = (i / 5) * Math.PI * 2;
            dot.position.set(Math.cos(ang) * 0.45, 1.35, Math.sin(ang) * 0.45);
            group.add(dot);
        }
        return group;
    },

    createSakuraTree: (color = 0xff7043) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.6, 4, 12),
            new THREE.MeshStandardMaterial({ color: 0x8d6e63 })
        );
        trunk.position.y = 2;
        tree.add(trunk);

        const leavesMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
        const top1 = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 16), leavesMat);
        top1.position.y = 4.5;
        tree.add(top1);

        const top2 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), leavesMat);
        top2.position.set(1.1, 4.0, 0);
        tree.add(top2);

        return tree;
    },

    // 🦋 MARIPOSA AMBIENTAL (decorativa, revolotea sola - vida en el Jardín Rosa)
    createButterfly: (color = 0xff80ab) => {
        const group = new THREE.Group();
        const wingMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
        const wingL = new THREE.Mesh(new THREE.CircleGeometry(0.28, 10, 0, Math.PI), wingMat);
        wingL.rotation.y = Math.PI / 2;
        wingL.position.x = -0.03;
        wingL.name = 'wingL';
        group.add(wingL);
        const wingR = wingL.clone();
        wingR.rotation.y = -Math.PI / 2;
        wingR.position.x = 0.03;
        wingR.name = 'wingR';
        group.add(wingR);
        const bodyMat = new THREE.MeshBasicMaterial({ color: 0x4a148c });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6), bodyMat);
        body.rotation.z = Math.PI / 2;
        group.add(body);
        group.scale.set(1.2, 1.2, 1.2);
        return group;
    },

    // ✨ LUCIÉRNAGA AMBIENTAL (decorativa - vida nocturna en Castillo Dulce)
    createFirefly: () => {
        const group = new THREE.Group();
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff59d });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), glowMat);
        group.add(glow);
        const haloMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4, transparent: true, opacity: 0.35 });
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), haloMat);
        group.add(halo);
        return group;
    },

    // 🐦 PAJARITO AMBIENTAL (decorativo - vida en Valle Dorado)
    createBird: (color = 0xff7043) => {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), bodyMat);
        body.scale.set(1.3, 1, 1);
        group.add(body);
        const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const wingL = new THREE.Mesh(new THREE.CircleGeometry(0.15, 8, 0, Math.PI), wingMat);
        wingL.position.set(-0.05, 0.02, 0);
        wingL.rotation.y = Math.PI / 2;
        wingL.name = 'wingL';
        group.add(wingL);
        const wingR = wingL.clone();
        wingR.position.set(0.05, 0.02, 0);
        wingR.rotation.y = -Math.PI / 2;
        wingR.name = 'wingR';
        group.add(wingR);
        const beakMat = new THREE.MeshBasicMaterial({ color: 0xffca28 });
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), beakMat);
        beak.rotation.z = -Math.PI / 2;
        beak.position.set(0.18, 0, 0);
        group.add(beak);
        return group;
    },

    updatePlayerSpriteAnim: (playerMesh, direction, frameIndex, isAirborne = false) => {
        if (!playerMesh || !playerMesh.userData) return;

        // Personajes geométricos (Kuromi, My Melody, Purin, Cinnamoroll): no
        // tienen textura, así que se animan moviendo su "rig" y sus piezas
        // (piernas, brazos, cola, orejas) en vez de cambiar cuadros de sprite.
        if (playerMesh.userData.isGeo) {
            const ud = playerMesh.userData;
            const rig = ud.rig;
            if (!rig) return;

            // Gira el personaje para que mire hacia el lado en que camina.
            rig.rotation.y = direction === 'left' ? -Math.PI / 2 : Math.PI / 2;

            const baseY = ud.baseY ?? 0;
            if (isAirborne) {
                // Estirón hacia arriba en el salto (squash & stretch clásico)
                rig.scale.set(0.9, 1.15, 0.9);
                rig.position.y = baseY + 0.05;
                if (ud.legL) ud.legL.rotation.x = -0.4;
                if (ud.legR) ud.legR.rotation.x = 0.4;
                if (ud.armL) ud.armL.rotation.x = -0.6;
                if (ud.armR) ud.armR.rotation.x = 0.6;
            } else {
                const phase = ((frameIndex % 4) / 4) * Math.PI * 2;
                const bounce = Math.abs(Math.sin(phase)) * 0.14;
                rig.position.y = baseY + bounce;

                // Achatadito al tocar el piso, más redondo al despegar: le da peso y vida.
                const squash = 1 - bounce * 0.4;
                rig.scale.set(1 + (1 - squash) * 0.5, squash, 1 + (1 - squash) * 0.5);

                const swing = Math.sin(phase) * 0.55;
                if (ud.legL) ud.legL.rotation.x = swing;
                if (ud.legR) ud.legR.rotation.x = -swing;
                if (ud.armL) ud.armL.rotation.x = -swing * 0.7;
                if (ud.armR) ud.armR.rotation.x = swing * 0.7;

                if (ud.tailMesh) ud.tailMesh.rotation.y = Math.sin(phase * 1.5) * 0.45;
                const earWiggle = Math.sin(phase * 2) * 0.06;
                if (ud.earL) ud.earL.rotation.z = (ud.earBaseRotZ ?? 0.4) + earWiggle;
                if (ud.earR) ud.earR.rotation.z = -(ud.earBaseRotZ ?? 0.4) - earWiggle;
            }
            return;
        }

        if (!playerMesh.userData.texture) return;
        const texture = playerMesh.userData.texture;
        const layout = playerMesh.userData.spriteLayout || 'grid4x4';

        if (layout === 'grid4x4') {
            let row = (direction === 'left') ? 1 : 2;
            let col = frameIndex % 4;
            texture.offset.x = col * 0.25;
            texture.offset.y = (3 - row) * 0.25;
        } else {
            // Layout de una sola fila (Kuromi, Purin, Cinnamoroll, My Melody).
            // Ciclo de 4 pasos reutilizando las 3 poses reales (0,1,3) para que
            // el caminar se sienta tan vivo como el de Hello Kitty, aunque el
            // arte no tenga piernas distintas por fotograma. Col 2 queda
            // reservada solo para el salto.
            const WALK_CYCLE = [0, 1, 3, 1];
            const col = isAirborne ? 2 : WALK_CYCLE[frameIndex % WALK_CYCLE.length];
            texture.offset.x = col * 0.25;
            texture.offset.y = 0;
            const sprite = playerMesh.userData.sprite;
            if (sprite) {
                const base = Math.abs(sprite.scale.x) || 3.2;
                sprite.scale.x = direction === 'left' ? -base : base;

                // Rebotito vertical sincronizado con el paso: le da "peso" y
                // vida al caminar en vez de quedar plantada en su sitio.
                const baseY = playerMesh.userData.spriteBaseY ?? 1.2;
                if (isAirborne) {
                    sprite.position.y = baseY;
                    sprite.scale.y = Math.abs(sprite.scale.x); // sin squash en el aire
                } else if (col === 0) {
                    sprite.position.y = baseY;
                    sprite.scale.y = base;
                } else {
                    sprite.position.y = baseY + 0.08;
                    sprite.scale.y = base * 0.97;
                }
            }
        }
    },

    createHeartMesh: (color = 0xff1744) => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.1 });
        const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), mat);
        s1.position.set(-0.16, 0.16, 0);
        group.add(s1);
        const s2 = s1.clone(); s2.position.x = 0.16;
        group.add(s2);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.65, 16), mat);
        cone.rotation.z = Math.PI; cone.position.set(0, -0.12, 0);
        group.add(cone);
        return group;
    },

    // ESTRELLA DECORATIVA BRILLANTE
    createStarMesh: (color = 0xffd54f) => {
        const shape = new THREE.Shape();
        const spikes = 5, outerR = 0.5, innerR = 0.2;
        for (let i = 0; i < spikes * 2; i++) {
            const r = (i % 2 === 0) ? outerR : innerR;
            const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
            if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
        }
        shape.closePath();

        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.15 });
        const mesh = new THREE.Mesh(geo, mat);
        return mesh;
    },

    // LLAVE COLECCIONABLE DE MUNDO (dorada, con moño rosa a juego con el tema Sanrio)
    createKeyMesh: () => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffb300, emissiveIntensity: 0.5, metalness: 0.75, roughness: 0.2 });

        // Anillo de la llave
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 12, 24), mat);
        ring.position.set(-0.35, 0, 0);
        group.add(ring);

        // Vástago
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 10), mat);
        shaft.rotation.z = Math.PI / 2;
        shaft.position.set(0.25, 0, 0);
        group.add(shaft);

        // Dientes de la llave
        const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.14), mat);
        tooth1.position.set(0.6, -0.15, 0);
        group.add(tooth1);

        const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.14), mat);
        tooth2.position.set(0.78, -0.1, 0);
        group.add(tooth2);

        // Moñito rosa Sanrio en el anillo
        const bowMat = new THREE.MeshStandardMaterial({ color: 0xff4081, roughness: 0.25 });
        const bow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), bowMat);
        bow.position.set(-0.35, 0.32, 0);
        group.add(bow);

        group.scale.set(1.15, 1.15, 1.15);
        return group;
    },

    // ARCO VICTORIA HELLO KITTY CON MOÑO GIGANTE
    createGoalPost: () => {
        const group = new THREE.Group();

        const cake = new THREE.Mesh(
            new THREE.CylinderGeometry(2.2, 2.5, 1.5, 32), 
            new THREE.MeshStandardMaterial({ color: 0xf48fb1, roughness: 0.3 })
        );
        cake.position.y = 0.75;
        cake.receiveShadow = true;
        group.add(cake);

        const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 16), poleMat);
        p1.position.set(-1.5, 3.8, 0);
        group.add(p1);

        const p2 = p1.clone();
        p2.position.x = 1.5;
        group.add(p2);

        // Moño Rosa Gigante
        const bowMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.2 });
        const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), bowMat);
        bowCenter.position.set(0, 6.8, 0);
        group.add(bowCenter);

        const bowLeft = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 16), bowMat);
        bowLeft.rotation.z = Math.PI / 2;
        bowLeft.position.set(-0.8, 6.8, 0);
        group.add(bowLeft);

        const bowRight = bowLeft.clone();
        bowRight.rotation.z = -Math.PI / 2;
        bowRight.position.x = 0.8;
        group.add(bowRight);

        return group;
    },

    createCakeBulletMesh: (type) => {
        const mat = type === 'normal' 
            ? new THREE.MeshStandardMaterial({ color: 0xff4081, roughness: 0.1 }) 
            : new THREE.MeshStandardMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9 });
        return new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), mat);
    }
};



// ==========================================================
// --- MUNDOS CON IDENTIDAD PROPIA -------------------------
// Jardín Rosa (jardín de sakuras y flores) · Valle Dorado (campos de trigo y molinos)
// · Castillo Dulce (castillos y golosinas de noche)
// ==========================================================
(function () {
    const M = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6 }, extra || {}));
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const still = (o) => { o.userData.isStaticDecor = true; return o; }; // no gira con el fondo animado

    // ---------- PLATAFORMAS ----------
    const origPlatform = Render3D.createPlatformMesh;
    Render3D.createPlatformMesh = (width, height, depth, colorHex, theme) => {
        if (theme === 'garden') return Render3D.createGardenPlatform(width, height, depth, colorHex);
        if (theme === 'golden') return Render3D.createGoldenPlatform(width, height, depth, colorHex);
        return origPlatform(width, height, depth, colorHex); // Castillo Dulce: glaseado con sprinkles
    };

    // Jardín Rosa: maceta rosa con pasto y flores, troncos de madera de pilares
    Render3D.createGardenPlatform = (width, height, depth, colorHex) => {
        const group = new THREE.Group();
        group.add(new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), M(colorHex, { roughness: 0.4 })));
        const grass = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 0.45, depth + 0.3), M(0x7ed957, { roughness: 0.85 }));
        grass.position.y = height / 2 + 0.2;
        group.add(grass);

        const tuftGeo = new THREE.ConeGeometry(0.14, 0.45, 5);
        const tuftMat = M(0x4caf50);
        const tufts = Math.max(5, Math.floor(width * 0.9));
        for (let i = 0; i < tufts; i++) {
            const t = new THREE.Mesh(tuftGeo, tuftMat);
            t.position.set(-width / 2 + 0.4 + (i / (tufts - 1)) * (width - 0.8), height / 2 + 0.55, depth / 2 + 0.05 - Math.random() * 0.4);
            t.rotation.z = rnd(-0.25, 0.25);
            group.add(t);
        }
        const flowerGeo = new THREE.SphereGeometry(0.16, 8, 8);
        const flowerMats = [0xffffff, 0xffeb3b, 0xff80ab, 0xf48fb1, 0xce93d8].map(c => M(c, { roughness: 0.4 }));
        const flowers = Math.floor(width * 0.7);
        for (let i = 0; i < flowers; i++) {
            const f = new THREE.Mesh(flowerGeo, pick(flowerMats));
            f.position.set(rnd(-width / 2 + 0.5, width / 2 - 0.5), height / 2 + 0.5, rnd(-depth / 2 + 0.4, depth / 2 - 0.2));
            group.add(f);
        }
        const logMat = M(0x8d6e63, { roughness: 0.9 });
        const ringMat = M(0x6d4c41, { roughness: 0.9 });
        const addLog = (x) => {
            const log = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.75, 18, 12), logMat);
            log.position.set(x, -9, 0);
            group.add(log);
            [-1.5, -4, -6.5, -9, -12].forEach(y => {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.05, 6, 14), ringMat);
                ring.rotation.x = Math.PI / 2;
                ring.position.set(x, y, 0);
                group.add(ring);
            });
        };
        addLog(-width / 2 + 1.2);
        if (width > 6) addLog(width / 2 - 1.2);
        return group;
    };

    // Valle Dorado: bloques de arenisca con arena dorada arriba y columnas con bandas de oro
    Render3D.createGoldenPlatform = (width, height, depth, colorHex) => {
        const group = new THREE.Group();
        group.add(new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), M(colorHex, { roughness: 0.75 })));
        const lineMat = M(0x7a4a00, { roughness: 0.9 });
        const bricks = Math.max(2, Math.floor(width / 2));
        for (let i = 1; i < bricks; i++) {
            const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, height * 0.95, 0.05), lineMat);
            l.position.set(-width / 2 + i * (width / bricks), 0, depth / 2 + 0.02);
            group.add(l);
        }
        const row = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.07, 0.05), lineMat);
        row.position.set(0, 0, depth / 2 + 0.02);
        group.add(row);

        const sand = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 0.4, depth + 0.3), M(0xffe082, { roughness: 0.95 }));
        sand.position.y = height / 2 + 0.18;
        group.add(sand);
        const gold = M(0xffd700, { metalness: 0.7, roughness: 0.25 });
        const trim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.36, 0.14, 0.2), gold);
        trim.position.set(0, height / 2 + 0.25, depth / 2 + 0.2);
        group.add(trim);
        const duneGeo = new THREE.SphereGeometry(0.5, 10, 6);
        const duneMat = M(0xffd54f, { roughness: 0.95 });
        for (let i = 0; i < Math.floor(width / 3); i++) {
            const d = new THREE.Mesh(duneGeo, duneMat);
            d.scale.set(rnd(1, 1.8), 0.22, rnd(0.8, 1.4));
            d.position.set(rnd(-width / 2 + 1, width / 2 - 1), height / 2 + 0.4, rnd(-depth / 2 + 0.6, depth / 2 - 0.6));
            group.add(d);
        }
        const gemMat = M(0xff6f00, { emissive: 0xff8f00, emissiveIntensity: 0.4 });
        for (let i = 0; i < Math.floor(width / 4); i++) {
            const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), gemMat);
            gem.position.set(-width / 2 + 1.5 + i * 4, 0.1, depth / 2 + 0.08);
            group.add(gem);
        }
        const colMat = M(0xd9a441, { roughness: 0.8 });
        const addCol = (x) => {
            const col = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 18, 14), colMat);
            col.position.set(x, -9, 0);
            group.add(col);
            [-2, -6, -10, -14].forEach(y => {
                const band = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.09, 6, 16), gold);
                band.rotation.x = Math.PI / 2;
                band.position.set(x, y, 0);
                group.add(band);
            });
        };
        addCol(-width / 2 + 1.2);
        if (width > 6) addCol(width / 2 - 1.2);
        return group;
    };

    // ---------- ADORNOS SOBRE LAS PLATAFORMAS (por mundo) ----------
    Render3D.createThemeProp = (type) => {
        const g = new THREE.Group();
        if (type === 'tulip') {
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), M(0x66bb6a));
            stem.position.y = 0.37; g.add(stem);
            const cup = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), M(pick([0xff4081, 0xffca28, 0xf06292, 0xba68c8])));
            cup.scale.set(1, 1.35, 1); cup.position.y = 0.92; g.add(cup);
            [-1, 1].forEach(s => {
                const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), M(0x81c784));
                leaf.scale.set(0.5, 2.2, 0.4); leaf.position.set(s * 0.14, 0.3, 0); leaf.rotation.z = -s * 0.5; g.add(leaf);
            });
        } else if (type === 'picket') {
            const wood = M(0xfff8f0, { roughness: 0.6 });
            for (let i = 0; i < 4; i++) {
                const p = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.0, 0.1), wood);
                p.position.set(-0.75 + i * 0.5, 0.5, 0); g.add(p);
                const tip = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.25, 4), wood);
                tip.position.set(-0.75 + i * 0.5, 1.12, 0); tip.rotation.y = Math.PI / 4; g.add(tip);
            }
            [0.3, 0.7].forEach(y => { const rail = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.08), wood); rail.position.set(0, y, -0.08); g.add(rail); });
        } else if (type === 'wheat') {
            const stalk = M(0xd4a017), head = M(0xffca28);
            for (let i = 0; i < 7; i++) {
                const h = rnd(0.9, 1.3), x = rnd(-0.35, 0.35), tilt = rnd(-0.2, 0.2);
                const s = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, h, 5), stalk);
                s.position.set(x, h / 2, rnd(-0.2, 0.2)); s.rotation.z = tilt; g.add(s);
                const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), head);
                e.scale.set(1, 3, 1); e.position.set(x - Math.sin(tilt) * h / 2, h + 0.1, s.position.z); g.add(e);
            }
        } else if (type === 'haystack') {
            const hay = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), M(0xe6b800, { roughness: 0.95 }));
            hay.scale.set(1, 0.85, 1); hay.position.y = 0.45; g.add(hay);
            [0.25, 0.6].forEach(y => { const band = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.04, 6, 16), M(0x8d6e00)); band.rotation.x = Math.PI / 2; band.position.y = y; g.add(band); });
        } else if (type === 'pumpkin') {
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), M(0xff8f00, { roughness: 0.5 }));
            body.scale.set(1, 0.8, 1); body.position.y = 0.4; g.add(body);
            [-0.22, 0.22].forEach(x => { const seg = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), M(0xf57c00, { roughness: 0.5 })); seg.scale.set(0.55, 0.78, 0.85); seg.position.set(x, 0.4, 0.05); g.add(seg); });
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.22, 6), M(0x5d4037)); stem.position.y = 0.82; g.add(stem);
        } else if (type === 'rock') {
            [[0, 0.3, 0, 0.45], [0.5, 0.18, 0.1, 0.28]].forEach(([x, y, z, rad]) => {
                const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(rad), M(pick([0xc9a66b, 0xb08d57]), { roughness: 0.95 }));
                rk.position.set(x, y, z); rk.rotation.set(rnd(0, 3), rnd(0, 3), 0); g.add(rk);
            });
        } else if (type === 'goldpot') {
            const pot = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), M(0x5d4037, { roughness: 0.6 }));
            pot.scale.set(1, 0.8, 1); pot.position.y = 0.35; g.add(pot);
            const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 8, 16), M(0x3e2723)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.66; g.add(rim);
            for (let i = 0; i < 5; i++) {
                const c = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), M(0xffd700, { metalness: 0.7, roughness: 0.25 }));
                c.position.set(rnd(-0.2, 0.2), 0.72 + rnd(0, 0.1), rnd(-0.2, 0.2)); g.add(c);
            }
        } else if (type === 'cupcake') {
            const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.45, 12), M(pick([0xf48fb1, 0x80deea, 0xce93d8])));
            wrap.position.y = 0.23; g.add(wrap);
            const cream = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), M(0xfff0f5, { roughness: 0.3 }));
            cream.scale.set(1, 0.85, 1); cream.position.y = 0.62; g.add(cream);
            const top = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), M(0xffc1e3, { roughness: 0.3 })); top.position.y = 0.95; g.add(top);
            const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), M(0xff1744, { roughness: 0.2 })); cherry.position.y = 1.18; g.add(cherry);
        } else if (type === 'banner') {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), M(0xffd54f, { metalness: 0.5 }));
            pole.position.y = 1.1; g.add(pole);
            const flag = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.04), M(pick([0xff4081, 0xba68c8, 0x4dd0e1])));
            flag.position.set(0.45, 1.85, 0); g.add(flag);
            const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), M(0xfff59d, { emissive: 0xfff59d, emissiveIntensity: 0.5 }));
            star.position.set(0.45, 1.85, 0.05); g.add(star);
        } else {
            return null;
        }
        return g;
    };
    const origProp = Render3D.createProp;
    // Adornos de plataforma que reutilizan los modelos del decorado (se escalan para que midan lo de un adorno normal
    // y se apoyan con su base exactamente en y = 0)
    const PROP_BUILDERS = {
        rose: () => {
            const g = new THREE.Group();
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 6), CM(0x7bc47f));
            stem.position.y = 0.4; g.add(stem);
            [-1, 1].forEach(s => {
                const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), CM(0x9ddca7, { roughness: 0.8 }));
                leaf.scale.set(1.6, 0.35, 0.8); leaf.position.set(s * 0.17, 0.35, 0); leaf.rotation.z = s * 0.4; g.add(leaf);
            });
            const bloom = makeRose(pick(ROSE_COLORS), 0.4);
            bloom.position.y = 0.78; g.add(bloom);
            return g;
        },
        rosebush: () => { const g = makeRoseBush(); g.scale.setScalar(0.5); return g; },
        oreRock:  () => { const g = makeOreRock(); g.scale.setScalar(0.6); return g; },
        crystal:  () => { const g = makeCrystalCluster(pick([0xffb300, 0xffa000, 0x4dd0e1])); g.scale.setScalar(0.34); return g; },
        minecart: () => { const g = makeMineCart(); g.scale.setScalar(0.85); return g; },
        cactus:   () => { const g = makeCactus(); g.scale.setScalar(0.45); return g; },
        donut:    () => { const g = makeDonut(); g.scale.setScalar(0.3); return g; },
        icecream: () => { const g = makeIceCreamTree(); g.scale.setScalar(0.3); return g; }
    };
    Render3D.createProp = (type) => {
        const build = PROP_BUILDERS[type];
        if (build) {
            const inner = build();
            const wrap = new THREE.Group();
            wrap.add(inner);
            wrap.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(wrap);
            inner.position.y -= box.min.y; // la base queda apoyada en la plataforma
            return wrap;
        }
        return Render3D.createThemeProp(type) || origProp(type);
    };

    // ---------- FONDOS ----------
    // El fondo tiene miles de piezas pequeñas. Las que no se mueven nunca se funden en pocas mallas grandes
    // (agrupadas por material y por tramo de 70 unidades del nivel, para que el motor siga descartando lo que no se ve).
    // Se ven exactamente igual, pero se dibujan con muchas menos llamadas. Quedan fuera las piezas animadas
    // (molinos, ruedas, rayos de sol), las transparentes y las que usan texturas.
    function mergeStaticDecor(g) {
        g.updateMatrixWorld(true);
        const CHUNK = 70;
        const buckets = new Map();
        const detach = [];
        const canMerge = (o) => {
            const m = o.material;
            return o.isMesh && !o.isInstancedMesh && m && !Array.isArray(m) && !m.map && !m.vertexColors && !m.transparent
                && !(m.opacity !== undefined && m.opacity < 1) && o.matrixWorld.determinant() > 0;
        };
        g.children.forEach(c => {
            const u = c.userData || {};
            if (!u.isStaticDecor || u.spinners || u.isWindmill || u.isSunRays || u.rise || u.isMagicTree) return;
            let animated = false;
            c.traverse(o => {
                const ou = o.userData || {};
                if (o.name === 'blades' || ou.rise || ou.spinners) animated = true;
            });
            if (animated) return;
            const chunk = Math.floor(c.position.x / CHUNK);
            // Se funden las piezas opacas; las transparentes (cristales, brillos...) se quedan donde están
            c.traverse(o => {
                if (!canMerge(o)) return;
                const m = o.material;
                const key = [chunk, m.type, m.color.getHex(), m.roughness, m.metalness, m.emissive ? m.emissive.getHex() : 0,
                    m.emissiveIntensity, m.side, m.flatShading ? 1 : 0].join('|');
                if (!buckets.has(key)) buckets.set(key, { mat: m, items: [] });
                buckets.get(key).items.push(o);
                detach.push(o);
            });
        });
        buckets.forEach(({ mat, items }) => {
            let vCount = 0, iCount = 0;
            const geos = items.map(o => {
                const geo = o.geometry.clone();
                geo.applyMatrix4(o.matrixWorld);
                vCount += geo.attributes.position.count;
                iCount += geo.index ? geo.index.count : geo.attributes.position.count;
                return geo;
            });
            const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3), idx = new Uint32Array(iCount);
            let vo = 0, io = 0;
            geos.forEach(geo => {
                const p = geo.attributes.position, n = geo.attributes.normal;
                pos.set(p.array, vo * 3);
                if (n) nor.set(n.array, vo * 3);
                if (geo.index) { for (let k = 0; k < geo.index.count; k++) idx[io + k] = geo.index.array[k] + vo; io += geo.index.count; }
                else { for (let k = 0; k < p.count; k++) idx[io + k] = vo + k; io += p.count; }
                vo += p.count;
                geo.dispose();
            });
            const out = new THREE.BufferGeometry();
            out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
            out.setIndex(new THREE.BufferAttribute(idx, 1));
            const mesh = new THREE.Mesh(out, mat);
            mesh.userData.isStaticDecor = true;
            mesh.matrixAutoUpdate = false;
            g.add(mesh);
        });
        detach.forEach(o => { if (o.parent) o.parent.remove(o); });
        return g;
    }
    Render3D._mergeStaticDecor = mergeStaticDecor; // expuesta para poder verificarla
    Render3D.createBackgroundDecor = (scene, levelWidth, theme = 'garden') =>
        mergeStaticDecor(Render3D._buildBackgroundDecor(scene, levelWidth, theme));

    Render3D._buildBackgroundDecor = (scene, levelWidth, theme = 'garden') => {
        if (theme === 'golden') {
            const g = Render3D._createDecorBase(scene, levelWidth, 'golden', { trees: false, forest: false, mushrooms: false });
            addGoldenExtras(g, levelWidth);
            return g;
        }
        if (theme === 'night') {
            const g = Render3D._createDecorBase(scene, levelWidth, 'night', { trees: false, forest: false, mushrooms: false });
            addCastleExtras(g, levelWidth);
            return g;
        }
        const g = Render3D._createDecorBase(scene, levelWidth, 'garden', { forest: false, mushrooms: false });
        addGardenExtras(g, levelWidth);
        return g;
    };

    // Campo de pequeños elementos con un solo objeto 3D (mucho más ligero que cientos de mallas sueltas)
    function scatterInstanced(group, W, count, geoA, matA, geoB, matB, placeFn, colors) {
        const a = new THREE.InstancedMesh(geoA, matA, count);
        const b = new THREE.InstancedMesh(geoB, matB, count);
        const dummy = new THREE.Object3D();
        const col = new THREE.Color();
        for (let i = 0; i < count; i++) {
            const p = placeFn(i);
            dummy.position.set(p.x, p.ya, p.z); dummy.rotation.set(0, 0, p.tilt || 0); dummy.scale.set(1, p.s, 1); dummy.updateMatrix();
            a.setMatrixAt(i, dummy.matrix);
            dummy.position.set(p.x, p.yb, p.z); dummy.scale.set(p.hs || p.s, p.hs || p.s, p.hs || p.s); dummy.updateMatrix();
            b.setMatrixAt(i, dummy.matrix);
            if (colors) b.setColorAt(i, col.setHex(pick(colors)));
        }
        still(a); still(b);
        group.add(a, b);
    }

    // ---------- Utilidades de decorado ----------
    const _mc = {};
    function CM(color, extra) { // materiales compartidos (menos memoria con cientos de adornos)
        const key = color + '|' + JSON.stringify(extra || {});
        if (!_mc[key]) _mc[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6 }, extra || {}));
        return _mc[key];
    }
    function beam(a, b, r, mat) { // cilindro entre dos puntos (vigas, patas...)
        const dir = new THREE.Vector3().subVectors(b, a);
        const len = dir.length();
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat);
        m.position.copy(a).addScaledVector(dir, 0.5);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        return m;
    }
    // Adornos que suben flotando (corazones, pétalos, chispas): los anima el bucle del juego (userData.rise)
    function addRising(group, W, count, makeFn, minY, maxY, speed) {
        for (let i = 0; i < count; i++) {
            const m = makeFn();
            const x = rnd(-10, W + 10);
            m.position.set(x, rnd(minY, maxY), rnd(-14, 6));
            m.userData = { rise: speed * rnd(0.7, 1.3), baseX: x, minY, maxY, sway: rnd(0.6, 1.4), ph: rnd(0, 6.28), amp: rnd(0.4, 1.2) };
            group.add(m);
        }
    }

    // =========================================================
    // JARDÍN ROSA — rosas, tonos pastel suaves y dulces
    // =========================================================
    const SHELL = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const ROSE_COLORS = [0xffc2d9, 0xffd1dc, 0xffb3cf, 0xe9d3ff, 0xfff0e6, 0xffcfb8, 0xffe0ec];
    const LEAF_COLORS = [0x9ddca7, 0xb5e6b0, 0x8fd49a];
    function makeRose(color, size) {
        const g = new THREE.Group();
        const c2 = new THREE.Color(color).multiplyScalar(0.88).getHex();
        const mats = [
            CM(color, { side: THREE.DoubleSide, roughness: 0.55, emissive: color, emissiveIntensity: 0.18 }),
            CM(c2, { side: THREE.DoubleSide, roughness: 0.55, emissive: c2, emissiveIntensity: 0.12 })
        ];
        [[1.0, 0.0, 0.75], [0.82, 0.12, 0.9], [0.64, 0.24, 1.0], [0.46, 0.34, 1.1], [0.28, 0.42, 1.2]].forEach(([s, y, h], i) => {
            const sh = new THREE.Mesh(SHELL, mats[i % 2]);
            sh.rotation.x = Math.PI; sh.rotation.y = i * 1.1;
            sh.scale.set(s * size, s * size * h * 0.7, s * size);
            sh.position.y = y * size;
            g.add(sh);
        });
        const bud = new THREE.Mesh(new THREE.SphereGeometry(0.2 * size, 8, 8), mats[1]);
        bud.position.y = 0.3 * size; g.add(bud);
        return g;
    }
    function makeRoseBush() {
        const g = new THREE.Group();
        const leaf = CM(pick(LEAF_COLORS), { roughness: 0.85 });
        [[0, 0.9, 0, 1.3], [-1.1, 0.7, 0.1, 0.95], [1.1, 0.75, -0.1, 1.0]].forEach(([x, y, z, r]) => {
            const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), leaf);
            b.position.set(x, y, z); b.scale.y = 0.85; g.add(b);
        });
        for (let i = 0; i < 10; i++) {
            const a = rnd(0.12, 0.88) * Math.PI;
            const rose = makeRose(pick(ROSE_COLORS), rnd(0.3, 0.46));
            rose.position.set(Math.cos(a) * 1.9, 0.45 + Math.sin(a) * 1.35, rnd(0.55, 1.0));
            rose.rotation.x = rnd(0.25, 0.7);
            g.add(rose);
        }
        return g;
    }
    function makeRoseArch() {
        const g = new THREE.Group();
        const white = CM(0xfff5f8, { roughness: 0.5 });
        [-1.9, 1.9].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 4.6, 8), white); p.position.set(x, 2.3, 0); g.add(p); });
        const arc = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.14, 8, 20, Math.PI), white);
        arc.position.y = 4.6; g.add(arc);
        const leaf = CM(0x9ddca7);
        for (let i = 0; i <= 8; i++) { // hojas y rosas sobre el arco
            const a = (i / 8) * Math.PI;
            const rose = makeRose(pick(ROSE_COLORS), rnd(0.28, 0.4));
            rose.position.set(Math.cos(a) * 1.9, 4.6 + Math.sin(a) * 1.9, rnd(0.05, 0.25));
            rose.rotation.set(0.9, 0, Math.cos(a) * -0.5);
            g.add(rose);
            const lf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), leaf);
            lf.scale.set(1.6, 0.4, 0.8); lf.position.set(Math.cos(a) * 1.9 + 0.15, 4.6 + Math.sin(a) * 1.9 - 0.1, 0.1); g.add(lf);
        }
        [-1.9, 1.9].forEach(x => { for (let k = 0; k < 4; k++) {
            const rose = makeRose(pick(ROSE_COLORS), rnd(0.28, 0.4));
            rose.position.set(x + rnd(-0.15, 0.15), 0.9 + k * 1.0, 0.2); rose.rotation.x = 1.1; g.add(rose);
        } });
        return g;
    }
    function makeGazebo() {
        const g = new THREE.Group();
        const white = CM(0xfff5f8, { roughness: 0.5 });
        const floor = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.2, 0.4, 20), CM(0xffd6e7)); floor.position.y = 0.2; g.add(floor);
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 5, 8), white);
            p.position.set(Math.cos(a) * 3.4, 2.9, Math.sin(a) * 3.4); g.add(p);
            const r = makeRose(pick(ROSE_COLORS), 0.45); r.position.set(Math.cos(a) * 3.4, 1.0, Math.sin(a) * 3.4 + 0.3); r.rotation.x = 0.6; g.add(r);
        }
        const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.16, 8, 24), white); ring.rotation.x = Math.PI / 2; ring.position.y = 5.4; g.add(ring);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(3.9, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), CM(0xe9d5ff, { roughness: 0.4, emissive: 0xe9d5ff, emissiveIntensity: 0.15 }));
        dome.scale.y = 0.85; dome.position.y = 5.4; g.add(dome);
        const fin = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), CM(0xffd54f, { metalness: 0.5, roughness: 0.3 })); fin.position.y = 9.1; g.add(fin);
        for (let k = 0; k < 6; k++) { const r = makeRose(pick(ROSE_COLORS), 0.4); const a = k * 1.05; r.position.set(Math.cos(a) * 2.9, 5.5 + Math.sin(a * 2) * 0.1, Math.sin(a) * 2.9); r.rotation.x = 1.2; g.add(r); }
        return g;
    }
    function makeFountain() {
        const g = new THREE.Group();
        const stone = CM(0xffe3ee, { roughness: 0.5 });
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.5, 0.9, 24), stone); basin.position.y = 0.45; g.add(basin);
        const water = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.12, 24), new THREE.MeshStandardMaterial({ color: 0xc4ecff, transparent: true, opacity: 0.85, roughness: 0.1, emissive: 0x9fdcff, emissiveIntensity: 0.25 }));
        water.position.y = 0.92; g.add(water);
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.6, 12), stone); col.position.y = 2.1; g.add(col);
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.8, 0.5, 18), stone); bowl.position.y = 3.3; g.add(bowl);
        const spray = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 10), new THREE.MeshBasicMaterial({ color: 0xd8f3ff, transparent: true, opacity: 0.6 })); spray.position.y = 4.3; g.add(spray);
        for (let i = 0; i < 6; i++) { const a = i * 1.05; const r = makeRose(pick(ROSE_COLORS), 0.4); r.position.set(Math.cos(a) * 3.35, 0.95, Math.sin(a) * 3.35); r.rotation.x = 0.5; g.add(r); }
        return g;
    }
    function makeGiantRose() {
        const g = new THREE.Group();
        const h = rnd(7, 12);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, h, 8), CM(0x9ddca7)); stem.position.y = h / 2; g.add(stem);
        [-1, 1].forEach((s, i) => { const lf = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), CM(0xb5e6b0)); lf.scale.set(1.8, 0.2, 0.8); lf.position.set(s * 1.3, h * (0.3 + i * 0.2), 0); lf.rotation.z = s * 0.4; g.add(lf); });
        const rose = makeRose(pick(ROSE_COLORS), rnd(2.8, 4.2)); rose.position.y = h; rose.rotation.x = 0.55; g.add(rose);
        return g;
    }
    let _heartGeo = null;
    function heartMesh(color) {
        if (!_heartGeo) {
            const s = new THREE.Shape();
            s.moveTo(0, 0.35); s.bezierCurveTo(0, 0.6, -0.5, 0.7, -0.5, 0.3); s.bezierCurveTo(-0.5, -0.05, -0.1, -0.2, 0, -0.5);
            s.bezierCurveTo(0.1, -0.2, 0.5, -0.05, 0.5, 0.3); s.bezierCurveTo(0.5, 0.7, 0, 0.6, 0, 0.35);
            _heartGeo = new THREE.ExtrudeGeometry(s, { depth: 0.15, bevelEnabled: false });
        }
        const m = new THREE.Mesh(_heartGeo, CM(color, { emissive: color, emissiveIntensity: 0.35, roughness: 0.4 }));
        const sc = rnd(0.5, 1.1); m.scale.set(sc, sc, sc);
        return m;
    }
    const PETAL_GEO = new THREE.SphereGeometry(0.18, 8, 6);

    function addGardenExtras(group, W) {
        // Prado de florecitas pastel
        const palette = [0xffc2d9, 0xffffff, 0xfff3b0, 0xf8bbd9, 0xe1c4f7, 0xffd1dc];
        scatterInstanced(group, W, Math.ceil(W * 1.6),
            new THREE.CylinderGeometry(0.035, 0.035, 0.7, 5), CM(0xa5e0a4),
            new THREE.SphereGeometry(0.2, 8, 8), M(0xffffff, { roughness: 0.4 }),
            () => { const s = rnd(0.8, 1.6); return { x: rnd(-15, W + 15), z: rnd(-9.5, -3.5), s, ya: -0.45 + 0.35 * s, yb: -0.45 + 0.75 * s, hs: s }; }, palette);
        // Rosales llenos de rosas
        for (let x = -6; x < W + 12; x += rnd(8, 11)) {
            const bush = makeRoseBush(); const s = rnd(0.9, 1.4);
            bush.scale.set(s, s, s); bush.position.set(x, -0.4, rnd(-9.5, -5.5));
            group.add(still(bush));
        }
        // Arcos de rosas
        for (let x = 8; x < W + 10; x += 38) {
            const arch = makeRoseArch(); const s = rnd(1.2, 1.5);
            arch.scale.set(s, s, s); arch.position.set(x + rnd(-5, 5), -0.4, rnd(-8, -6));
            group.add(still(arch));
        }
        // Cenadores (glorietas) y fuentes
        for (let x = 30; x < W + 20; x += 95) {
            const gz = makeGazebo(); const s = rnd(1.5, 1.9);
            gz.scale.set(s, s, s); gz.position.set(x, -0.4, rnd(-22, -17));
            group.add(still(gz));
        }
        for (let x = 70; x < W + 20; x += 120) {
            const f = makeFountain(); const s = rnd(1.3, 1.7);
            f.scale.set(s, s, s); f.position.set(x, -0.4, rnd(-12, -9));
            group.add(still(f));
        }
        // Rosas gigantes de fondo
        for (let x = -5; x < W + 20; x += 16) {
            const gr = makeGiantRose();
            gr.position.set(x + rnd(-4, 4), -0.6, rnd(-34, -24));
            group.add(still(gr));
        }
        // Cercas blancas de jardín
        const wood = CM(0xfff8f0, { roughness: 0.6 });
        const pGeo = new THREE.BoxGeometry(0.26, 1.2, 0.1), tGeo = new THREE.ConeGeometry(0.18, 0.28, 4), rGeo = new THREE.BoxGeometry(6.2, 0.12, 0.08);
        for (let x = -5; x < W + 10; x += 26) {
            const fence = new THREE.Group();
            for (let i = 0; i < 9; i++) {
                const p = new THREE.Mesh(pGeo, wood); p.position.set(i * 0.72, 0.6, 0); fence.add(p);
                const t = new THREE.Mesh(tGeo, wood); t.position.set(i * 0.72, 1.33, 0); t.rotation.y = Math.PI / 4; fence.add(t);
            }
            [0.35, 0.85].forEach(y => { const rail = new THREE.Mesh(rGeo, wood); rail.position.set(2.9, y, -0.09); fence.add(rail); });
            fence.position.set(x, -0.4, -4.4);
            group.add(still(fence));
        }
        // Cerezos en tonos pastel
        const pinks = [0xffd1e3, 0xffc2d9, 0xffe0ec, 0xf8bbd9];
        for (let i = 0; i < Math.ceil(W / 14); i++) {
            const tree = Render3D.createSakuraTree(pick(pinks));
            const s = rnd(1.1, 1.7);
            tree.scale.set(s, s, s);
            tree.position.set(rnd(-10, W + 10), 0.4, rnd(-16, -11));
            group.add(still(tree));
        }
        // Arcoíris pastel
        const rb = [0xffb3ba, 0xffdfba, 0xffffba, 0xbaffc9, 0xbae1ff, 0xe3baff];
        for (let x = 20; x < W + 40; x += 140) {
            const arc = new THREE.Group();
            rb.forEach((c, k) => {
                const band = new THREE.Mesh(new THREE.TorusGeometry(26 - k * 1.1, 0.6, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.8 }));
                arc.add(band);
            });
            arc.position.set(x, -4, -62);
            group.add(still(arc));
        }
        // Corazones y pétalos que suben flotando
        addRising(group, W, Math.ceil(W / 7), () => heartMesh(pick([0xffc2d9, 0xffb3cf, 0xe9d3ff, 0xffd6e7])), -2, 22, 0.9);
        addRising(group, W, Math.ceil(W / 3), () => new THREE.Mesh(PETAL_GEO, CM(pick([0xffd1dc, 0xffc2d9, 0xffffff]), { emissive: 0xffc2d9, emissiveIntensity: 0.2 })), -2, 22, 0.6);
    }

    // =========================================================
    // VALLE DORADO — valles, cañones, minas y rocas
    // =========================================================
    function makeWindmill() {
        const g = new THREE.Group();
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 2.0, 7, 10), M(0xf5deb3, { roughness: 0.9 }));
        tower.position.y = 3.5; g.add(tower);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.2, 10), M(0xb5651d)); roof.position.y = 8.0; g.add(roof);
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.1), M(0x6d4c41)); door.position.set(0, 0.8, 1.9); g.add(door);
        const blades = new THREE.Group();
        blades.name = 'blades'; blades.position.set(0, 6.5, 1.7);
        blades.add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), M(0x5d4037)));
        for (let k = 0; k < 4; k++) {
            const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2;
            const spar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.6, 0.12), M(0x5d4037)); spar.position.y = 2.6;
            const sail = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.4, 0.05), M(0xfff8e1, { roughness: 0.9 })); sail.position.set(0.55, 2.8, 0.02);
            arm.add(spar, sail); blades.add(arm);
        }
        g.add(blades);
        g.userData.isWindmill = true;
        return g;
    }

    const WOOD = () => CM(0x6d4c41, { roughness: 0.9 });
    function makeGoldNugget(scale) {
        const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.16 * (scale || 1)), CM(0xffd700, { metalness: 0.8, roughness: 0.25, emissive: 0xffa000, emissiveIntensity: 0.25 }));
        m.rotation.set(rnd(0, 3), rnd(0, 3), 0);
        return m;
    }
    function makeMineCart() {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.85, 1.05), CM(0x7b4a2d, { roughness: 0.8 })); body.position.y = 0.75; g.add(body);
        const rim = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.12, 1.2), CM(0x4e342e, { metalness: 0.4 })); rim.position.y = 1.2; g.add(rim);
        [[-0.55, -0.5], [0.55, -0.5], [-0.55, 0.5], [0.55, 0.5]].forEach(([x, z]) => {
            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10), CM(0x37474f, { metalness: 0.6 }));
            w.rotation.x = Math.PI / 2; w.position.set(x, 0.3, z * 1.05); g.add(w);
        });
        for (let i = 0; i < 7; i++) { const n = makeGoldNugget(rnd(1, 1.8)); n.position.set(rnd(-0.6, 0.6), 1.25 + rnd(0, 0.18), rnd(-0.3, 0.3)); g.add(n); }
        return g;
    }
    function makeMineEntrance() {
        const g = new THREE.Group();
        const rock = CM(0x9c6b3c, { roughness: 0.95 });
        const mound = new THREE.Mesh(new THREE.SphereGeometry(5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), rock);
        mound.scale.set(1.55, 1.0, 0.8); g.add(mound);
        for (let i = 0; i < 7; i++) { // rocas sueltas sobre la montaña
            const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(0.6, 1.3)), CM(pick([0xb07a45, 0x8a5a30, 0xc48a50]), { roughness: 0.95 }));
            r.position.set(rnd(-6, 6), rnd(0.5, 3.8), rnd(-1, 2.5)); r.rotation.set(rnd(0, 3), rnd(0, 3), 0); g.add(r);
        }
        const hole = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 0.6), new THREE.MeshBasicMaterial({ color: 0x120a04 }));
        hole.position.set(0, 1.5, 3.55); g.add(hole);
        [-1.5, 1.5].forEach(x => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.4, 0.34), WOOD()); p.position.set(x, 1.7, 3.85); g.add(p); });
        const top = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.4, 0.45), WOOD()); top.position.set(0, 3.45, 3.85); g.add(top);
        [-1, 1].forEach(s => { const br = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 0.2), WOOD()); br.position.set(s * 1.2, 3.0, 3.85); br.rotation.z = s * 0.7; g.add(br); });
        const lampCap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.2, 6), CM(0x37474f)); lampCap.position.set(0, 3.0, 4.15); g.add(lampCap);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffe082 })); lamp.position.set(0, 2.75, 4.15); g.add(lamp);
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.25 })); glow.position.copy(lamp.position); g.add(glow);
        // vías por delante de la entrada y vagoneta con oro
        const railMat = CM(0x5d4037, { metalness: 0.6, roughness: 0.5 });
        [5.6, 6.6].forEach(z => { const r = new THREE.Mesh(new THREE.BoxGeometry(11, 0.1, 0.1), railMat); r.position.set(0, 0.12, z); g.add(r); });
        for (let i = 0; i < 13; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 1.4), WOOD()); t.position.set(-5.4 + i * 0.9, 0.06, 6.1); g.add(t); }
        const cart = makeMineCart(); cart.position.set(rnd(-2.5, 2.5), 0.1, 6.1); g.add(cart);
        const pile = new THREE.Group(); for (let i = 0; i < 8; i++) { const n = makeGoldNugget(rnd(1.2, 2)); n.position.set(rnd(-0.6, 0.6), 0.15 + rnd(0, 0.15), rnd(-0.4, 0.4)); pile.add(n); }
        pile.position.set(4.2, 0, 4.8); g.add(pile);
        return g;
    }
    function makeHeadframe() {
        const g = new THREE.Group();
        const wood = WOOD();
        const apex = new THREE.Vector3(0, 12, 0);
        [[-2.4, -1.8], [2.4, -1.8], [-2.4, 1.8], [2.4, 1.8]].forEach(([x, z]) => g.add(beam(new THREE.Vector3(x, 0, z), apex.clone().add(new THREE.Vector3(0, 0, 0)), 0.22, wood)));
        [3, 6, 9].forEach(y => { const k = 1 - y / 12; [[-1, 0], [1, 0]].forEach(([s]) => g.add(beam(new THREE.Vector3(-2.4 * k * 1, y, 1.8 * k), new THREE.Vector3(2.4 * k, y, 1.8 * k), 0.12, wood))); });
        const wheel = new THREE.Group();
        wheel.name = 'wheel';
        wheel.add(new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.16, 8, 24), CM(0x37474f, { metalness: 0.6, roughness: 0.4 })));
        for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.4, 0.1), CM(0x455a64, { metalness: 0.5 })); sp.rotation.z = k * Math.PI / 6; wheel.add(sp); }
        wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 10), CM(0xffd54f, { metalness: 0.6 })));
        wheel.rotation.x = 0; wheel.position.set(0, 11.2, 2.4);
        g.add(wheel);
        g.userData.spinners = [{ o: wheel, axis: 'z', speed: 0.8 }];
        g.add(beam(new THREE.Vector3(0, 9.5, 2.4), new THREE.Vector3(0.6, 1.2, 2.4), 0.05, CM(0x3e2723)));
        const hut = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.0, 3.4), CM(0xb07a45, { roughness: 0.9 })); hut.position.set(5, 1.5, 0); g.add(hut);
        const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.8, 4), CM(0x6d4c41)); hutRoof.rotation.y = Math.PI / 4; hutRoof.position.set(5, 3.9, 0); g.add(hutRoof);
        const hutWin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.1), new THREE.MeshBasicMaterial({ color: 0xffe082 })); hutWin.position.set(5, 1.8, 1.75); g.add(hutWin);
        return g;
    }
    function makeCliff(w, h) {
        const g = new THREE.Group();
        const cols = [0xe29a3c, 0xc9782a, 0xf0b25a, 0xb86a25, 0xdb8f35, 0xa85f20];
        const layers = Math.max(4, Math.round(h / 3.4));
        let y = 0;
        for (let i = 0; i < layers; i++) {
            const lh = rnd(2.6, 4), lw = w * (1 - i * rnd(0.04, 0.09)) * rnd(0.92, 1.05);
            const b = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, rnd(6, 9)), CM(cols[i % cols.length], { roughness: 0.95 }));
            b.position.set(rnd(-1.5, 1.5), y + lh / 2, 0); g.add(b);
            y += lh;
        }
        for (let i = 0; i < 4; i++) { // picos de roca arriba
            const sp = new THREE.Mesh(new THREE.ConeGeometry(rnd(1, 2.4), rnd(3, 7), 6), CM(pick([0xd98a2b, 0xbf6f1e]), { roughness: 0.95 }));
            sp.position.set(rnd(-w / 3, w / 3), y + 1.5, rnd(-1, 1)); g.add(sp);
        }
        return g;
    }
    function makeOreRock() {
        const g = new THREE.Group();
        [[0, 0.7, 0, 1.2], [1.3, 0.4, 0.3, 0.7], [-1.1, 0.45, -0.2, 0.8]].forEach(([x, y, z, r]) => {
            const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(r), CM(pick([0x8d6e63, 0x795548, 0x9e7b5a]), { roughness: 0.95 }));
            rk.position.set(x, y, z); rk.rotation.set(rnd(0, 3), rnd(0, 3), 0); g.add(rk);
            for (let i = 0; i < 4; i++) { const n = makeGoldNugget(1.1); n.position.set(x + rnd(-r, r) * 0.7, y + rnd(0, r) * 0.8, z + r * 0.75); g.add(n); }
        });
        return g;
    }
    function makeCrystalCluster(color) {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, transparent: true, opacity: 0.88, roughness: 0.15, metalness: 0.2 });
        for (let i = 0; i < 6; i++) {
            const h = rnd(1.2, 3.2);
            const c = new THREE.Mesh(new THREE.ConeGeometry(rnd(0.28, 0.5), h, 6), mat);
            c.position.set(rnd(-1, 1), h / 2, rnd(-0.5, 0.5)); c.rotation.z = rnd(-0.4, 0.4); g.add(c);
        }
        return g;
    }
    function makeCactus() {
        const g = new THREE.Group();
        const mat = CM(0x7cb342, { roughness: 0.8 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 3.2, 10), mat); trunk.position.y = 1.6; g.add(trunk);
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), mat); top.position.y = 3.2; g.add(top);
        [[-1, 1.6], [1, 2.1]].forEach(([s, y]) => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 8), mat); arm.position.set(s * 0.8, y + 0.5, 0); g.add(arm);
            const el = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.8, 8), mat); el.rotation.z = Math.PI / 2; el.position.set(s * 0.45, y, 0); g.add(el);
        });
        return g;
    }

    function addGoldenExtras(group, W) {
        // Valles: capas de colinas doradas que se pierden en la distancia
        const layers = [[-96, 0xf4dca4, 34, 0.38], [-82, 0xedc271, 30, 0.45], [-68, 0xdea044, 27, 0.5], [-54, 0xc4812a, 24, 0.55]];
        layers.forEach(([z, color, r, sy], li) => {
            const mat = new THREE.MeshStandardMaterial({ color, roughness: 1 });
            for (let x = -40 + li * 9; x < W + 60; x += r * 1.35) {
                const hill = new THREE.Mesh(new THREE.SphereGeometry(r * rnd(0.8, 1.2), 18, 10), mat);
                hill.scale.set(1.3, sy * rnd(0.8, 1.2), 0.9);
                hill.position.set(x + rnd(-6, 6), -r * sy * 0.55 - 2, z);
                group.add(still(hill));
            }
        });
        // Cañones con vetas de roca
        for (let x = -20; x < W + 50; x += 52) {
            const cliff = makeCliff(rnd(22, 34), rnd(14, 24));
            cliff.position.set(x + rnd(-8, 8), -2, rnd(-44, -36));
            group.add(still(cliff));
        }
        // Campos de trigo en el valle
        scatterInstanced(group, W, Math.ceil(W * 1.5),
            new THREE.CylinderGeometry(0.025, 0.035, 1.3, 5), M(0xd4a017),
            new THREE.SphereGeometry(0.1, 6, 6), M(0xffca28),
            () => { const s = rnd(0.8, 1.5); return { x: rnd(-15, W + 15), z: rnd(-9, -3.5), s, ya: -0.45 + 0.65 * s, yb: -0.45 + 1.32 * s, hs: 1.3, tilt: rnd(-0.12, 0.12) }; },
            [0xffca28, 0xffd54f, 0xffb300]);
        // Minas con vagoneta, vías y montoncitos de oro
        for (let x = 6; x < W + 20; x += rnd(40, 52)) {
            const mine = makeMineEntrance(); const s = rnd(1.1, 1.5);
            mine.scale.set(s, s, s);
            mine.position.set(x, -0.5, rnd(-17, -13));
            group.add(still(mine));
        }
        // Torres de extracción con rueda que gira
        for (let x = 34; x < W + 30; x += 88) {
            const hf = makeHeadframe(); const s = rnd(1.3, 1.7);
            hf.scale.set(s, s, s);
            hf.position.set(x + rnd(-6, 6), -0.5, rnd(-26, -21));
            group.add(hf);
        }
        // Rocas con pepitas de oro, cristales ámbar y cactus
        for (let x = -4; x < W + 12; x += rnd(11, 15)) {
            const ore = makeOreRock(); const s = rnd(0.9, 1.5);
            ore.scale.set(s, s, s); ore.position.set(x, -0.4, rnd(-10, -5.5)); group.add(still(ore));
        }
        for (let x = 6; x < W + 12; x += rnd(18, 26)) {
            const cr = makeCrystalCluster(pick([0xffa000, 0xffb300, 0xff8f00])); const s = rnd(0.9, 1.5);
            cr.scale.set(s, s, s); cr.position.set(x, -0.4, rnd(-10, -6)); group.add(still(cr));
        }
        for (let x = 2; x < W + 12; x += rnd(24, 34)) {
            const ca = makeCactus(); const s = rnd(0.9, 1.4);
            ca.scale.set(s, s, s); ca.position.set(x, -0.4, rnd(-9, -5)); group.add(still(ca));
        }
        // Molinos y heno del valle (menos que antes: ahora mandan las minas)
        for (let x = 20; x < W + 20; x += 115) {
            const mill = makeWindmill(); const s = rnd(1.4, 1.9);
            mill.scale.set(s, s, s); mill.position.set(x + rnd(-6, 6), -0.5, rnd(-34, -28));
            group.add(mill);
        }
        const hayMat = M(0xe6b800, { roughness: 0.95 }), bandMat = M(0x8d6e00);
        for (let x = 0; x < W + 10; x += 34) {
            const hay = new THREE.Group();
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 14), hayMat);
            body.rotation.z = Math.PI / 2; hay.add(body);
            [-0.35, 0.35].forEach(dx => { const b = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.04, 6, 16), bandMat); b.rotation.y = Math.PI / 2; b.position.x = dx; hay.add(b); });
            hay.position.set(x + rnd(-4, 4), 0.4, rnd(-7, -4.5));
            group.add(still(hay));
        }
        const autumn = [0xffb300, 0xff8f00, 0xffca28, 0xf57c00];
        for (let i = 0; i < Math.ceil(W / 28); i++) {
            const t = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 3, 8), M(0x6d4c41)); trunk.position.y = 1.5; t.add(trunk);
            [[0, 3.6, 0, 1.6], [-1, 3.0, 0.3, 1.1], [1, 3.1, -0.3, 1.2]].forEach(([x, y, z, rad]) => {
                const leaf = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), M(pick(autumn), { roughness: 0.8 }));
                leaf.position.set(x, y, z); t.add(leaf);
            });
            const s = rnd(0.9, 1.4);
            t.scale.set(s, s, s);
            t.position.set(rnd(-10, W + 10), -0.4, rnd(-14, -10));
            group.add(still(t));
        }
        // Rayos de sol girando detrás del sol
        const rays = new THREE.Group();
        for (let k = 0; k < 12; k++) {
            const ray = new THREE.Mesh(new THREE.BoxGeometry(2.2, 46, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.16 }));
            ray.position.y = 23; const holder = new THREE.Group(); holder.rotation.z = k * Math.PI / 6; holder.add(ray); rays.add(holder);
        }
        rays.position.set(W * 0.5, 14, -100);
        rays.userData.isSunRays = true;
        group.add(rays);
        // Chispitas de oro que suben con el calor
        addRising(group, W, Math.ceil(W / 6), () => new THREE.Mesh(new THREE.OctahedronGeometry(0.14), CM(0xffd700, { metalness: 0.7, roughness: 0.3, emissive: 0xffa000, emissiveIntensity: 0.5 })), -2, 20, 0.7);
    }

    // =========================================================
    // CASTILLO DULCE — un castillo hecho de golosinas
    // =========================================================
    const CANDY = { pink: 0xffc2dc, hot: 0xff6fa5, white: 0xfff5fa, mint: 0xb8f0d8, lilac: 0xd9c2ff, peach: 0xffd9b8, choc: 0x6d3b2a, lemon: 0xfff2a8, sky: 0xb3e5fc };
    const SPRINKLES = [0xff6fa5, 0x80deea, 0xfff176, 0xb388ff, 0x69f0ae, 0xffffff];
    function stripedTower(h, r, c1, c2) { // torre de caramelo con rayas
        const g = new THREE.Group();
        const n = Math.max(4, Math.round(h / 1.4));
        for (let i = 0; i < n; i++) {
            const seg = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.03, h / n, 14), CM(i % 2 ? c1 : c2, { roughness: 0.35 }));
            seg.position.y = (i + 0.5) * (h / n); g.add(seg);
        }
        return g;
    }
    function scoopRoof(r, color) { // techo de bola de helado con chispas y cereza
        const g = new THREE.Group();
        const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), CM(color, { roughness: 0.3 })); g.add(dome);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, r * 0.16, 8, 20), CM(CANDY.white, { roughness: 0.3 })); rim.rotation.x = Math.PI / 2; g.add(rim);
        for (let i = 0; i < 14; i++) {
            const a = rnd(0, 6.28), t = rnd(0.15, 1.3);
            const sp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.07), CM(pick(SPRINKLES)));
            sp.position.set(Math.cos(a) * Math.cos(t) * r * 1.01, Math.sin(t) * r * 1.01, Math.sin(a) * Math.cos(t) * r * 1.01);
            sp.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3)); g.add(sp);
        }
        const cherry = new THREE.Mesh(new THREE.SphereGeometry(r * 0.2, 10, 10), CM(0xff1744, { roughness: 0.2 })); cherry.position.y = r + r * 0.12; g.add(cherry);
        return g;
    }
    function coneRoof(r, h, color) { // techo de cucurucho con crema en espiral
        const g = new THREE.Group();
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), CM(color, { roughness: 0.35 })); cone.position.y = h / 2; g.add(cone);
        for (let i = 0; i < 4; i++) {
            const k = 1 - (i + 0.5) / 4.4;
            const ring = new THREE.Mesh(new THREE.TorusGeometry(r * k, 0.14, 8, 18), CM(CANDY.white, { roughness: 0.3 }));
            ring.rotation.x = Math.PI / 2; ring.position.y = h * (i + 0.5) / 4.4; g.add(ring);
        }
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(r * 0.3), CM(0xfff176, { emissive: 0xfff176, emissiveIntensity: 0.6 })); star.position.y = h + r * 0.25; g.add(star);
        return g;
    }
    function lollipopFlag(h) {
        const g = new THREE.Group();
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 6), CM(CANDY.white)); stick.position.y = h / 2; g.add(stick);
        const swirl = new THREE.Group();
        [[0.42, CANDY.hot], [0.3, CANDY.white], [0.18, CANDY.hot]].forEach(([rad, c], i) => {
            const d = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.1, 16), CM(c)); d.rotation.x = Math.PI / 2; d.position.z = i * 0.02; swirl.add(d);
        });
        swirl.position.y = h + 0.3; g.add(swirl);
        const pennant = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.04), CM(pick([CANDY.lilac, CANDY.mint, CANDY.lemon]))); pennant.position.set(0.5, h - 0.4, 0); g.add(pennant);
        return g;
    }
    function makeCandyCastle() {
        const g = new THREE.Group();
        const icing = CM(CANDY.white, { roughness: 0.3 });
        // Cuerpo principal de glaseado rosa con vetas de azúcar
        const keep = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 6), CM(pick([CANDY.pink, CANDY.peach]), { roughness: 0.4 })); keep.position.y = 5; g.add(keep);
        for (let i = 1; i < 4; i++) { const line = new THREE.Mesh(new THREE.BoxGeometry(12.05, 0.14, 6.05), icing); line.position.y = i * 2.5; g.add(line); }
        // Chorreado de azúcar blanco en el borde del techo
        const slab = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.6, 6.4), icing); slab.position.y = 10.2; g.add(slab);
        for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8), icing); d.scale.set(1, rnd(1.6, 3.2), 1); d.position.set(-5.4 + i * 1.35, 9.7 - rnd(0, 0.5), 3.15); g.add(d); }
        // Almenas de gominolas
        for (let i = 0; i < 8; i++) { const gd = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), CM(pick([CANDY.hot, CANDY.mint, CANDY.lemon, CANDY.lilac, CANDY.sky]), { roughness: 0.25 })); gd.position.set(-5.2 + i * 1.5, 10.5, 2.6); g.add(gd); }
        // Torres rayadas de caramelo con techos de helado
        [[-8, 15, 0], [8, 15, 1], [-3.8, 20, 2], [3.8, 18, 0]].forEach(([x, h, k]) => {
            const tw = stripedTower(h, 1.8, CANDY.hot, CANDY.white); tw.position.set(x, 0, 0); g.add(tw);
            const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.28, 8, 20), icing); ring.rotation.x = Math.PI / 2; ring.position.set(x, h, 0); g.add(ring);
            const roof = k === 1 ? scoopRoof(2.2, CANDY.mint) : k === 2 ? coneRoof(2.3, 4.6, CANDY.lilac) : coneRoof(2.3, 4.2, CANDY.peach);
            roof.position.set(x, h + 0.1, 0); g.add(roof);
            const flag = lollipopFlag(2.2); flag.position.set(x, h + (k === 1 ? 2.7 : 4.8), 0); g.add(flag);
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.12), new THREE.MeshBasicMaterial({ color: pick([0xffe082, 0xff9ec7, 0x9be7ff]) })); win.position.set(x, h * 0.6, 1.85); g.add(win);
        });
        // Ventanas de gelatina
        [-4, 0, 4].forEach((x, i) => {
            const fr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.9, 0.1), icing); fr.position.set(x, 6.6, 3.02); g.add(fr);
            const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.12), new THREE.MeshBasicMaterial({ color: [0xffe082, 0xff8fb8, 0x80deea][i] })); w.position.set(x, 6.6, 3.06); g.add(w);
        });
        // Puerta de barra de chocolate con pilares de bastón de caramelo
        const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.6, 0.16), CM(CANDY.choc, { roughness: 0.5 })); door.position.set(0, 1.8, 3.08); g.add(door);
        const lineMat = CM(0x8d5a3b);
        [-0.4, 0.4].forEach(x => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.5, 0.05), lineMat); l.position.set(x, 1.8, 3.18); g.add(l); });
        [0.9, 1.8, 2.7].forEach(y => { const l = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 0.05), lineMat); l.position.set(0, y, 3.18); g.add(l); });
        [-1.65, 1.65].forEach(x => { const c = stripedTower(3.8, 0.28, CANDY.hot, CANDY.white); c.position.set(x, 0, 3.2); g.add(c); });
        const arch = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.24, 8, 18, Math.PI), CM(CANDY.hot, { roughness: 0.3 })); arch.position.set(0, 3.8, 3.2); g.add(arch);
        const heart = heartMesh(0xff6fa5); heart.scale.set(1.6, 1.6, 1.6); heart.position.set(0, 7.9, 3.1); g.add(heart);
        // Oblea de entrada
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 4), CM(0xe9b872, { roughness: 0.8 })); bridge.position.set(0, 0.1, 5.2); g.add(bridge);
        return g;
    }
    function makeIceCreamTree() {
        const g = new THREE.Group();
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.4, 12), CM(0xe9b872, { roughness: 0.8 })); cone.rotation.x = Math.PI; cone.position.y = 1.7; g.add(cone);
        [[0, 3.9, 1.5, pick([CANDY.pink, CANDY.mint])], [0, 5.6, 1.2, pick([CANDY.lilac, CANDY.lemon])]].forEach(([x, y, r, c]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), CM(c, { roughness: 0.3 })); s.position.set(x, y, 0); g.add(s); });
        const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), CM(0xff1744, { roughness: 0.2 })); cherry.position.y = 7.0; g.add(cherry);
        return g;
    }
    function makeDonut() {
        const g = new THREE.Group();
        const dough = new THREE.Mesh(new THREE.TorusGeometry(2, 0.95, 12, 24), CM(0xe8b370, { roughness: 0.8 })); g.add(dough);
        const glaze = new THREE.Mesh(new THREE.TorusGeometry(2, 1.0, 12, 24, Math.PI * 2), CM(pick([CANDY.hot, CANDY.pink, CANDY.mint, CANDY.lilac]), { roughness: 0.25 })); glaze.scale.set(1, 1, 0.55); glaze.position.z = 0.35; g.add(glaze);
        for (let i = 0; i < 12; i++) { const a = rnd(0, 6.28), rr = 2 + rnd(-0.5, 0.5); const sp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.08), CM(pick(SPRINKLES))); sp.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0.85); sp.rotation.z = rnd(0, 3); g.add(sp); }
        g.rotation.x = -0.35;
        return g;
    }

    function addCastleExtras(group, W) {
        // Castillos de golosina con ventanas encendidas
        for (let x = 0; x < W + 60; x += 70) {
            const c = makeCandyCastle();
            const s = rnd(1.5, 2.1);
            c.scale.set(s, s, s);
            c.position.set(x + rnd(-10, 10), -6, rnd(-64, -52));
            group.add(still(c));
        }
        // Colinas de merengue al fondo
        const meringue = [0x6a3a9a, 0x7e4aa8];
        for (let x = -20; x < W + 60; x += 34) {
            const h = new THREE.Mesh(new THREE.SphereGeometry(rnd(14, 20), 14, 10), CM(pick(meringue), { roughness: 0.9 }));
            h.scale.set(1.5, 0.5, 1); h.position.set(x + rnd(-6, 6), -9, rnd(-40, -32)); group.add(still(h));
        }
        // Golosinas gigantes en primer plano, helados y donas
        const types = ['candycane', 'lollipop', 'gumdrop', 'cupcake', 'candycane', 'lollipop'];
        for (let i = 0; i < Math.ceil(W / 10); i++) {
            const prop = Render3D.createProp(pick(types));
            const s = rnd(2.6, 4.6);
            prop.scale.set(s, s, s);
            prop.position.set(rnd(-12, W + 12), -0.4, rnd(-14, -8));
            group.add(still(prop));
        }
        for (let x = 4; x < W + 10; x += rnd(26, 34)) {
            const t = makeIceCreamTree(); const s = rnd(1.3, 1.9);
            t.scale.set(s, s, s); t.position.set(x, -0.4, rnd(-22, -15)); group.add(still(t));
        }
        for (let x = 14; x < W + 10; x += rnd(40, 55)) {
            const d = makeDonut(); const s = rnd(1.1, 1.6);
            d.scale.set(s, s, s); d.position.set(x, 1.5, rnd(-20, -13)); group.add(still(d));
        }
        // Nubes de algodón de azúcar
        const cotton = [0xffc1e3, 0xb3e5fc, 0xe1bee7, 0xf8bbd0];
        for (let i = 0; i < Math.ceil(W / 16); i++) {
            const cloud = new THREE.Group();
            const mat = new THREE.MeshStandardMaterial({ color: pick(cotton), transparent: true, opacity: 0.85, roughness: 0.9 });
            [[0, 0, 2.6], [2.2, -0.3, 1.9], [-2.2, -0.2, 1.8], [1, 1.1, 1.7]].forEach(([x, y, rad]) => {
                const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mat); b.position.set(x, y, 0); cloud.add(b);
            });
            cloud.position.set(rnd(-10, W + 20), rnd(14, 26), rnd(-42, -28));
            group.add(still(cloud));
        }
        // Chispas de colores que suben flotando
        const sprGeo = new THREE.BoxGeometry(0.3, 0.08, 0.08);
        addRising(group, W, Math.ceil(W / 3.5), () => { const m = new THREE.Mesh(sprGeo, CM(pick(SPRINKLES), { emissive: 0xffffff, emissiveIntensity: 0.15 })); m.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3)); return m; }, -2, 24, 0.7);
    }

    // ---------- OBJETOS NUEVOS DE JUEGO ----------
    Render3D.createPowerUpMesh = (type) => {
        const colors = { speed: 0xffd600, jump: 0x00e676, magnet: 0xff1744 };
        const c = colors[type] || 0xffffff;
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), M(c, { emissive: c, emissiveIntensity: 0.6, roughness: 0.3 })));
        const aura = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 16), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.28 }));
        aura.name = 'puAura'; g.add(aura);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        ring.name = 'puRing'; ring.rotation.x = Math.PI / 2.4; g.add(ring);
        const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
        if (type === 'speed') {
            [-0.1, 0.14].forEach(x => { const ch = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.3, 3), white); ch.rotation.z = -Math.PI / 2; ch.position.set(x, 0, 0.43); g.add(ch); });
        } else if (type === 'jump') {
            const up = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 3), white); up.position.set(0, 0.1, 0.43); g.add(up);
            const stem = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.04), white); stem.position.set(0, -0.13, 0.43); g.add(stem);
        } else {
            const arc = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.06, 8, 16, Math.PI), white); arc.position.set(0, 0.0, 0.43); g.add(arc);
            [-0.17, 0.17].forEach(x => { const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.05), white); tip.position.set(x, -0.08, 0.43); g.add(tip); });
        }
        return g;
    };

    Render3D.createCheckpointMesh = () => {
        const g = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.25, 12), M(0x8d6e63)); base.position.y = 0.12; g.add(base);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 8), M(0xffd700, { metalness: 0.6, roughness: 0.3 })); pole.position.y = 1.8; g.add(pole);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), M(0xffd700, { metalness: 0.6, roughness: 0.3 })); knob.position.y = 3.55; g.add(knob);
        const flag = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 0.06), M(0x9e9e9e));
        flag.name = 'flag'; flag.position.set(0.72, 2.95, 0); g.add(flag);
        return g;
    };

    Render3D.createEnemyShotMesh = () => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), new THREE.MeshBasicMaterial({ color: 0x40c4ff })));
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), new THREE.MeshBasicMaterial({ color: 0x80d8ff, transparent: true, opacity: 0.3 })));
        return g;
    };

    Render3D.createEnemyShieldMesh = () => {
        const g = new THREE.Group();
        const rim = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.62, 1.22), M(0xffd54f, { metalness: 0.6, roughness: 0.3 }));
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 1.1), M(0x90a4ae, { metalness: 0.7, roughness: 0.3 }));
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
        gem.position.x = 0.12;
        g.add(rim, plate, gem);
        return g;
    };

    // Adornos de plataforma nuevos: rosas (Jardín), minerales (Valle), helados (Castillo)
    const _prevTheme = Render3D.createThemeProp;
    const NEW_PROPS = {
        rose: () => { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 6), CM(0x9ddca7)); st.position.y = 0.27; g.add(st); const rs = makeRose(pick(ROSE_COLORS), 0.34); rs.position.y = 0.55; rs.rotation.x = 0.25; g.add(rs); return g; },
        rosebush: () => { const g = makeRoseBush(); g.scale.set(0.36, 0.36, 0.36); return g; },
        oreRock: () => { const g = makeOreRock(); g.scale.set(0.5, 0.5, 0.5); return g; },
        crystal: () => { const g = makeCrystalCluster(pick([0xffa000, 0xffb300])); g.scale.set(0.5, 0.5, 0.5); return g; },
        cactus: () => { const g = makeCactus(); g.scale.set(0.38, 0.38, 0.38); return g; },
        minecart: () => { const g = makeMineCart(); g.scale.set(0.6, 0.6, 0.6); return g; },
        icecream: () => { const g = makeIceCreamTree(); g.scale.set(0.2, 0.2, 0.2); return g; },
        donut: () => { const g = makeDonut(); g.scale.set(0.24, 0.24, 0.24); g.position.y = 0.3; const w = new THREE.Group(); w.add(g); return w; }
    };
    Render3D.createThemeProp = (type) => NEW_PROPS[type] ? NEW_PROPS[type]() : _prevTheme(type);
})();