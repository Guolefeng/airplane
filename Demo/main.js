// 定义一个调色板
var Colors = {
    red: 0xf25346,
    white: 0xd8d0d1,
    brown: 0x59332e,
    pink: 0xf5986e,
    brownDark: 0x23190f,
    blue: 0x68c3c0
}
window.addEventListener('load', init, false);
function init() {
    // 验证webGL兼容性
    if(!Detector.webgl) Detector.addGetWebGLMessage();

    // 创建场景,相机和渲染器
    createScene();
    // 添加光源
    createLights();
    // 添加对象
    createSea();
    createSky();
    createPlane();
    // 添加监听器
    document.addEventListener('mousemove', handleMouseMove, false);
    // 调用循环函数, 在每帧更新对象的位置和渲染场景
    loop();
}

var scene, camera, renderer, fieldOfView, aspectRatio, 
    nearPlane, farPlane, HEIGHT, WIDTH, container, stats;
function createScene() {
    // 获取屏幕的宽高, 用它们设置相机的横纵比还有渲染器的大小
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;

    // 创建场景
    scene = new THREE.Scene();
    // 在场景中添加雾的效果; 样式使用和背景一样的颜色
    scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);

    // 创建相机
    fieldOfView = 60;
    aspectRatio = WIDTH / HEIGHT;
    nearPlane = 1;
    farPlane = 10000;
    /**
   * PerspectiveCamera 透视相机
   * @param fieldOfView 视角
   * @param aspectRatio 纵横比
   * @param nearPlane 近平面
   * @param farPlane 远平面
   */
    camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane);
    // 设置相机的位置
    camera.position.x = 0;
    camera.position.z = 200;
    camera.position.y = 100;

    // 创建渲染器
    renderer = new THREE.WebGLRenderer({
        // 显示在css中设置的背景色, 所以这里用透明以显示背景渐变色
        alpha: true,
        // 开启抗锯齿,但这样会降低性能
        antialias: true
    });
    // 定义渲染器的尺寸；在这里它会填满整个屏幕
    renderer.setSize(WIDTH, HEIGHT);
    // 打开渲染器的阴影地图
    renderer.shadowMap.enabled = true;
    // 在 HTML 创建的容器中添加渲染器的 DOM 元素
    container = document.getElementById('world')
    container.appendChild(renderer.domElement);
    
    // 添加屏幕帧率展示器
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    container.appendChild(stats.domElement);

    // 监听屏幕, 缩放屏幕更新相机和渲染器的尺寸
    window.addEventListener('resize', handleWindowResize, false);
}
// 由于屏幕的尺寸改变，我们需要更新渲染器的尺寸和相机的纵横比。
function handleWindowResize() {
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;
    renderer.setSize(WIDTH, HEIGHT);
    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();
}

// 光源
var hemisphereLight, shadowLight, ambientLight;
function createLights() {
    // 半球光就是渐变的光
    // 第一个参数是天空的颜色, 第二个参数是地上的颜色, 第三个参数是光源的强度
    hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .7);

    // 方向光是从一个特定的方向照射,类似太阳, 即所有的光源是平行的
    // 第一个参数是关系颜色, 第二个参数是光源的强度
    shadowLight = new THREE.DirectionalLight(0xffffff, .6);

    // 设置光源的方向
    // 位置不同, 方向光作用于物体的面也不同, 看到的颜色也不同
    shadowLight.position.set(150, 350, 350)

    // 开启光源投影
    shadowLight.castShadow = true;

    // 定义可见域的投射阴影
    shadowLight.shadow.camera.left = -400;
    shadowLight.shadow.camera.right = 400;
    shadowLight.shadow.camera.top = 400;
    shadowLight.shadow.camera.bottom = -400;
    shadowLight.shadow.camera.near = 1;
    shadowLight.shadow.camera.far = 1000;

    // 定义阴影的分辨率; 虽然分辨率越高越好, 但是需要付出更加昂贵的代价维持高性能的表现.
    shadowLight.shadow.mapSize.width = 2048;
    shadowLight.shadow.mapSize.height = 2048;

    // 环境光源修改场景中的全局颜色和使阴影更加柔和
    ambientLight = new THREE.AmbientLight(0xdc8874, .5);

    // 为了使这些光源呈现效果, 只需要将它们添加到场景中
    scene.add(hemisphereLight);
    scene.add(shadowLight);
    scene.add(ambientLight);
}

// 大海
// 首先定义一个大海对象
Sea = function() {
    // 创建一个圆柱几何体
    // 参数为: 顶面半径, 地面半径, 高度, 半径分段, 高度分段
    var geom = new THREE.CylinderGeometry(600, 600, 800, 40, 10);
    // 在 x 轴旋转几何体
    geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
    
    // 通过合并定点, 我们确保海浪的连续性
    geom.mergeVertices();
    // 获得定点
    var l = geom.vertices.length;
    // 创建一个新的数组存储与每个定点关联的值
    this.waves = [];
    for(var i = 0; i < l; i++) {
        // 获取每个定点
        var v = geom.vertices[i];
        this.waves.push({
            y: v.y,
            x: v.x,
            z: v.z,
            // 随机角度
            ang: Math.random() * Math.PI * 2,
            // 随机距离
            amp: 5 + Math.random() * 15,
            // 在0.016至0.048度/帧之间的随机速度
            speed: 0.016 + Math.random() * 0.032
        });
    }

    // 创建材质
    var mat = new THREE.MeshPhongMaterial({
        color: Colors.blue,
        transparent: true,
        opacity: .9,
        shading: THREE.FlatShading
    })

    // 为了在Three.js创建一个物体, 我们必须创建一个网格用来组合几何体和一些材质
    this.mesh = new THREE.Mesh(geom, mat);

    // 允许大海对象接收阴影
    this.mesh.receiveShadow = true;
}
Sea.prototype.moveWaves = function() {
    // 获取定点
    var verts = this.mesh.geometry.vertices;
    var l = verts.length;
    for(var i = 0; i < l; i++) {
        var v = verts[i];
        // 获取关联的值
        var vprops = this.waves[i];
        // 更新定点的位置
        v.x = vprops.x + Math.cos(vprops.ang) * vprops.amp;
        v.y = vprops.y + Math.sin(vprops.ang) * vprops.amp;
        // 下一帧自增一个角度
        vprops.ang += vprops.speed;
    }

    // 告诉渲染器代表大海的几何体发生改变
    // 事实上, 为了维持最好的性能, Three.js会缓存几何体和忽略一些修改
    // 除非加上这句
    this.mesh.geometry.verticesNeedUpdate = true;
    sea.mesh.rotation.z += 0.005;
}

// 实例化大海对象, 并添加至场景
var sea;
function createSea() {
    sea = new Sea();
    // 在场景底部, 稍微推挤一下
    sea.mesh.position.y = -600;
    // 添加大海的网格至场景
    scene.add(sea.mesh);
}

// 云
Cloud = function() {
    // 创建一个空的容器放置不同形状的云
    this.mesh = new THREE.Object3D();
    // 创建一个正方体
    // 这个形状会被复制创建云
    var geom = new THREE.BoxGeometry(20, 20, 20);
    // 创建材质; 一个简单的白色材质就可达到效果
    var mat = new THREE.MeshPhongMaterial({
        color: Colors.white
    })

    //随机多次复制几何体
    var nBlocs = 3 + Math.floor(Math.random() * 3);
    for(var i = 0; i < nBlocs; i++) {
        // 通过复制的几何体创建网格
        var m = new THREE.Mesh(geom, mat);
        // 随机设置每个正方体的位置和旋转角度
        m.position.x = i * 15;
        m.position.y = Math.random() * 10;
        m.position.z = Math.random() * 10;
        m.rotation.z = Math.random() * Math.PI * 2;
        m.rotation.y = Math.random() * Math.PI * 2;

        // 随机设置正方体的大小
        var s = .1 + Math.random() * 0.9;
        m.scale.set(s, s, s);

        // 允许每个正方体生成投影和接收阴影
        m.castShadow = true;
        m.receiveShadow = true;

        // 将正方体添加至开始时我们创建的容器中
        this.mesh.add(m);
    }
}

// 现在，我们已经创建一朵云，我们通过复制它来创建天空，
// 而且将其放置在 z 轴任意位置。

// 天空
// 定义一个天空对象
Sky = function() {
    // 创建一个空的容器
    this.mesh = new THREE.Object3D();

    // 选取若干朵云散布在天空中
    this.nClouds = 20;
    // 把云均匀地散布
    // 我们需要根据统一的角度放置他们
    var stepAngle = Math.PI * 2 / this.nClouds;

    // 创建云对象
    for(var i = 0; i < this.nClouds; i++) {
        var c = new Cloud();

        // 设置每朵云的旋转角度和位置
        // 因此我们使用了一点三角函数
        var a = stepAngle * i; // 这是云的最终角度
        var h = 750 + Math.random() * 200;  // 这是轴的中心和云本身之间的距离

        // 三角函数
        // 我们简单地把极坐标转换成笛卡尔坐标
        c.mesh.position.y = Math.sin(a) * h;
        c.mesh.position.x = Math.cos(a) * h;

        // 根据云的位置旋转它
        c.mesh.rotation.z = -400-Math.random() * 400;

        // 而且我们为每朵云设置一个随机大小
        var s = 1 + Math.random() * 2;
        c.mesh.scale.set(s, s, s);

        // 不要忘记将每朵云的网格添加到场景中
        this.mesh.add(c.mesh);
    }
}

// 现在我们实例化天空对象, 而且将他放置在屏幕中间稍微偏下的位置
var sky;
function createSky() {
    sky = new Sky();
    sky.mesh.position.y = -600;
    scene.add(sky.mesh);
}

// 创建飞机
var AirPlane = function() {
    this.mesh = new THREE.Object3D();

    // 创建机舱
    var geomCockpit = new THREE.BoxGeometry(80, 50, 50, 1, 1, 1);
    var matCockpit = new THREE.MeshPhongMaterial({
        color: Colors.red,
        shading: THREE.FlatShading
    });
    // 我们可以通过访问形状中定点数组中的一组特定的定点
    // 然后移动它的 x, y, z属性:
    geomCockpit.vertices[4].y -= 10;
    geomCockpit.vertices[4].z += 20;
    geomCockpit.vertices[5].y -= 10;
    geomCockpit.vertices[5].z -= 20;
    geomCockpit.vertices[6].y += 30;
    geomCockpit.vertices[6].z += 20;
    geomCockpit.vertices[7].y += 30;
    geomCockpit.vertices[7].z += 20;

    var cockpit = new THREE.Mesh(geomCockpit, matCockpit);
    cockpit.castShadow = true;
    cockpit.receiveShadow = true;
    this.mesh.add(cockpit);

    // 创建引擎
    var geomEngine = new THREE.BoxGeometry(20, 50, 50, 1, 1, 1);
    var matEngine = new THREE.MeshPhongMaterial({
        color: Colors.white,
        shading: THREE.FlatShading
    });
    var engine = new THREE.Mesh(geomEngine, matEngine);
    engine.position.x = 40;
    engine.castShadow = true;
    engine.receiveShadow = true;
    this.mesh.add(engine);

    // 创建机尾
    var geomTailPlane = new THREE.BoxGeometry(15, 20, 5, 1, 1, 1);
    var matTailPlane = new THREE.MeshPhongMaterial({
        color: Colors.red,
        shading: THREE.FlatShading
    });
    var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
    tailPlane.position.set(-35, 25, 0);
    tailPlane.castShadow = true;
    tailPlane.receiveShadow = true;
    this.mesh.add(tailPlane);

    // 创建机翼
    var geoSideWing = new THREE.BoxGeometry(40, 8, 150, 1, 1, 1);
    var matSideWing = new THREE.MeshPhongMaterial({
        color: Colors.pink,
        shading: THREE.FlatShading
    });
    var sideWing = new THREE.Mesh(geoSideWing, matSideWing);
    sideWing.castShadow = true;
    sideWing.receiveShadow = true;
    this.mesh.add(sideWing);

    // 创建螺旋桨
    var geomPropeller = new THREE.BoxGeometry(20, 10, 10, 1, 1, 1);
    var matPropeller = new THREE.MeshPhongMaterial({
        color: Colors.brown,
        shading: THREE.FlatShading
    });
    this.propeller = new THREE.Mesh(geomPropeller, matPropeller)
    this.propeller = new THREE.Mesh(geomBlade, matBlade);
    this.propeller.castShadow = true;
    this.propeller.receiveShadow = true;

    // 创建螺旋桨的桨叶
    var geomBlade = new THREE.BoxGeometry(1, 100, 20, 1, 1, 1);
    var matBlade = new THREE.MeshPhongMaterial({
        color: Colors.brownDark,
        shading: THREE.FlatShading
    });
    var blade = new THREE.Mesh(geomBlade, matBlade);
    blade.position.set(8, 0, 0);
    blade.castShadow = true;
    blade.receiveShadow = true;
    this.propeller.add(blade);
    this.propeller.position.set(50, 0, 0);
    this.mesh.add(this.propeller);
}
var airplane;
function createPlane() {
    airplane = new AirPlane();
    airplane.mesh.scale.set(.25, .25, .25);
    airplane.mesh.position.y = 100;
    scene.add(airplane.mesh);
}

// 通过使螺旋桨旋转并转动大海和云让我们的场景更具生命力。
// 因此我们需要一个无限循环函数
function loop() {
    // 使螺旋桨旋转并转动大海和云
    airplane.propeller.rotation.x += 0.3;
    sea.mesh.rotation.z += 0.005;
    sky.mesh.rotation.z += 0.01;

    // 更新每帧的飞机
    updatePlane();

    // 更新海浪
    sea.moveWaves();

    // 渲染场景
    renderer.render(scene, camera);
    // 重新调用 render() 函数
    requestAnimationFrame(loop);

    // 帧率
    stats.update();
}

// 创建一个mousemove 事件处理函数
var mousePos = {x: 0, y: 0};
function handleMouseMove(event) {
    // 这里把接收到的鼠标位置的值转换成归一化值, 在-1与1之间变化
    // 这是x轴的公式:
    var tx = -1 + (event.clientX / WIDTH) * 2;

    // 对于y轴, 我们需要一个逆公式
    // 因为 2D 的y轴与 3D 的y轴方向相反
    var ty = 1 - (event.clientY / HEIGHT) * 2;
    mousePos = {x: tx, y: ty};
}

function updatePlane() {
    // 让我们在x轴上-100至100之间 和 y轴25到175之间移动飞机
    // 根据鼠标的位置在-1与1之间的范围, 我们使用的 normalize 函数实现(如下)
    var targetX = normalize(mousePos.x, -1, 1, -100, 100);
    var targetY = normalize(mousePos.y, -1, 1, 25, 175);

    // 更新飞机的位置
    // 在每帧通过添加剩余距离的一小部分的值移动飞机
    airplane.mesh.position.y += (targetY - airplane.mesh.position.y) * 0.1;
    airplane.mesh.position.x = targetX;
    airplane.mesh.rotation.z = (targetY - airplane.mesh.position.y) * 0.0128;
    airplane.propeller.rotation.x += (airplane.mesh.position.y - targetY) * 0.0064;
    
    airplane.propeller.rotation.x += 0.3;
}
function normalize(v, vmin, vmax, tmin, tmax) {
    var nv = Math.max(Math.min(v, vmax), vmin);
    var dv = vmax - vmin;
    var pc = (nv - vmin) / dv;
    var dt = tmax - tmin;
    var tv = tmin + (pc * dt);
    return tv;
}