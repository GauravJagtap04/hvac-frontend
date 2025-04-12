import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ChilledWaterSystemModel = ({
  roomParameters,
  hvacParameters,
  systemStatus,
  isSimulationRunning,
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const roomRef = useRef(null);
  const heatmapRef = useRef([]);
  const airflowParticlesRef = useRef([]);
  const outdoorUnitRef = useRef(null);
  const indoorUnitRef = useRef(null);
  const electricalConduitRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [modelLoaded, setModelLoaded] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 10, z: 15 });

  useEffect(() => {
    // Function to update background based on theme
    const updateSceneBackground = () => {
      if (!sceneRef.current) return;

      const root = document.getElementById("root");
      const isDarkMode = root && root.classList.contains("dark");

      // Use hex color value instead of OKLCH
      sceneRef.current.background = new THREE.Color(
        isDarkMode ? "#0a0a0a" : "white"
      );
    };

    // Set up MutationObserver to detect theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          updateSceneBackground();
        }
      });
    });

    const root = document.getElementById("root");

    // Only observe if root exists
    if (root) {
      // Start observing the document element for class changes
      observer.observe(root, { attributes: true });
    }

    // Initial background update
    updateSceneBackground();

    // Clean up observer on component unmount
    return () => observer.disconnect();
  }, []);

  // Initialize the scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Create scene
    const scene = new THREE.Scene();

    // Check if root element has dark class and set background accordingly
    const root = document.getElementById("root");
    const isDarkMode = root && root.classList.contains("dark");

    // Use hex color value instead of OKLCH
    scene.background = new THREE.Color(isDarkMode ? "#0a0a0a" : "white");
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      45,
      dimensions.width / dimensions.height,
      0.1,
      1000
    );
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    cameraRef.current = camera;

    // Setup renderer with pixel ratio for better quality
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(dimensions.width, dimensions.height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Add complementary lights for better illumination
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Handle window resize
    const handleResize = () => {
      if (mountRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        setDimensions({ width, height });

        if (rendererRef.current && cameraRef.current) {
          rendererRef.current.setSize(width, height);
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
        }
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Update particles if simulation is running
      if (isSimulationRunning && airflowParticlesRef.current.length > 0) {
        updateAirflowParticles();
      }

      // Update refrigerant line animation if simulation is running
      if (isSimulationRunning && electricalConduitRef.current) {
        console.log(
          "Updating particles: " + airflowParticlesRef.current.length
        );
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameRef.current);

      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }

      // Clean up Three.js resources
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, []);

  // Create or update room
  useEffect(() => {
    if (!sceneRef.current) return;

    // Remove old room if it exists
    if (roomRef.current) {
      sceneRef.current.remove(roomRef.current);
    }

    // Room dimensions
    const { length, breadth, height } = roomParameters;

    // Create room group
    const roomGroup = new THREE.Group();

    // Create room walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(length, breadth);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -height / 2;
    floor.receiveShadow = true;
    roomGroup.add(floor);

    // Room walls (transparent planes with edges)
    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(length, height),
      wallMaterial
    );
    backWall.position.z = -breadth / 2;
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    // Front wall (no need due to camera angle)
    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(length, height),
      wallMaterial
    );
    frontWall.position.z = breadth / 2;
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    roomGroup.add(frontWall);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(breadth, height),
      wallMaterial
    );
    leftWall.position.x = -length / 2;
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    roomGroup.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(breadth, height),
      wallMaterial
    );
    rightWall.position.x = length / 2;
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    roomGroup.add(rightWall);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(length, breadth),
      wallMaterial
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height / 2;
    ceiling.receiveShadow = true;
    roomGroup.add(ceiling);

    // Room edges
    const edges = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(length, height, breadth)
    );
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const roomEdges = new THREE.LineSegments(edges, edgesMaterial);
    roomGroup.add(roomEdges);

    // Add indoor AC unit
    createIndoorUnit(roomGroup, length, height, breadth);

    // Add outdoor unit
    createOutdoorUnit(roomGroup, length, height, breadth);

    // Add refrigerant line connecting both units
    createElectricalConduit(roomGroup, length, height, breadth);

    // Position the entire room at origin
    roomGroup.position.set(0, 0, 0);

    // Add to scene and save reference
    sceneRef.current.add(roomGroup);
    roomRef.current = roomGroup;

    // Center camera on room
    if (cameraRef.current) {
      const idealDistance = Math.max(length, breadth, height) * 1.5;
      setCameraPosition({
        x: length / 2,
        y: height / 1.5,
        z: idealDistance,
      });
      cameraRef.current.position.set(length / 2, height / 1.5, idealDistance);
      cameraRef.current.lookAt(new THREE.Vector3(0, 0, 0));
    }

    // Create heat map
    createHeatmap();

    // Create airflow particles
    createAirflowParticles();

    setModelLoaded(true);
  }, [roomParameters.length, roomParameters.breadth, roomParameters.height]);

  // Create indoor unit
  const createIndoorUnit = (roomGroup, length, height, breadth) => {
    // Create fan coil units (FCUs) based on room parameters
    const numFCUs = roomParameters.fanCoilUnits || 1;

    for (let i = 0; i < numFCUs; i++) {
      // Create fan coil unit group
      const fcuGroup = new THREE.Group();

      // Calculate position - distribute FCUs evenly along walls
      let xPos, yPos, zPos, rotation;

      if (numFCUs <= 4) {
        // Place units on the ceiling
        const spacing = length / (numFCUs + 1);
        xPos = -length / 2 + spacing * (i + 1);
        yPos = height / 2 - 0.1; // Just below ceiling
        zPos = 0;
        rotation = Math.PI; // Face down

        // Main FCU body
        const fcuGeometry = new THREE.BoxGeometry(0.8, 0.25, 0.8);
        const fcuMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.3,
        });
        const fcu = new THREE.Mesh(fcuGeometry, fcuMaterial);
        fcu.castShadow = true;
        fcuGroup.add(fcu);

        // Air diffuser
        const diffuserGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.05, 16);
        const diffuserMaterial = new THREE.MeshStandardMaterial({
          color: 0xeeeeee,
        });
        const diffuser = new THREE.Mesh(diffuserGeometry, diffuserMaterial);
        diffuser.position.y = -0.15;
        diffuser.rotation.x = Math.PI;
        fcuGroup.add(diffuser);

        // Status indicator light
        const lightGeometry = new THREE.CircleGeometry(0.05, 16);
        const lightMaterial = new THREE.MeshBasicMaterial({
          color: isSimulationRunning ? 0x00ff00 : 0xff0000,
          side: THREE.DoubleSide,
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.set(0.3, -0.13, 0.3);
        light.rotation.x = Math.PI / 2;
        fcuGroup.add(light);
      } else {
        // Place units on walls for larger numbers
        const unitsPerWall = Math.ceil(numFCUs / 4);
        const wallIndex = Math.floor(i / unitsPerWall);
        const posInWall = i % unitsPerWall;

        switch (wallIndex) {
          case 0: // Front wall
            xPos =
              -length / 2 + (length / (unitsPerWall + 1)) * (posInWall + 1);
            yPos = height / 4;
            zPos = -breadth / 2 + 0.15;
            rotation = 0;
            break;
          case 1: // Right wall
            xPos = length / 2 - 0.15;
            yPos = height / 4;
            zPos =
              -breadth / 2 + (breadth / (unitsPerWall + 1)) * (posInWall + 1);
            rotation = -Math.PI / 2;
            break;
          case 2: // Back wall
            xPos = length / 2 - (length / (unitsPerWall + 1)) * (posInWall + 1);
            yPos = height / 4;
            zPos = breadth / 2 - 0.15;
            rotation = Math.PI;
            break;
          case 3: // Left wall
            xPos = -length / 2 + 0.15;
            yPos = height / 4;
            zPos =
              breadth / 2 - (breadth / (unitsPerWall + 1)) * (posInWall + 1);
            rotation = Math.PI / 2;
            break;
        }

        // Wall-mounted FCU
        const fcuGeometry = new THREE.BoxGeometry(0.8, 0.25, 0.4);
        const fcuMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.3,
        });
        const fcu = new THREE.Mesh(fcuGeometry, fcuMaterial);
        fcu.castShadow = true;
        fcuGroup.add(fcu);

        // Air vent
        const ventGeometry = new THREE.BoxGeometry(0.7, 0.05, 0.1);
        const ventMaterial = new THREE.MeshStandardMaterial({
          color: 0xeeeeee,
        });
        const vent = new THREE.Mesh(ventGeometry, ventMaterial);
        vent.position.z = 0.2;
        vent.rotation.x = -Math.PI / 6; // Angle slightly downward
        fcuGroup.add(vent);
      }

      fcuGroup.position.set(xPos, yPos, zPos);
      fcuGroup.rotation.y = rotation;
      roomGroup.add(fcuGroup);
    }

    // Create water pipes connecting FCUs
    createWaterPipes(roomGroup, length, height, breadth, numFCUs);
  };

  const createWaterPipes = (roomGroup, length, height, breadth, numFCUs) => {
    const pipeGroup = new THREE.Group();

    // Create supply and return pipe materials
    const supplyPipeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2196f3,
      metalness: 0.6,
      roughness: 0.2,
      emissive: 0x1976d2,
      emissiveIntensity: 0.2,
    });

    const returnPipeMaterial = new THREE.MeshStandardMaterial({
      color: 0x90caf9,
      metalness: 0.6,
      roughness: 0.2,
      emissive: 0x42a5f5,
      emissiveIntensity: 0.1,
    });

    const pipeRadius = 0.03;

    // Create main supply and return pipes along the ceiling
    const mainPipePoints = [
      new THREE.Vector3(-length / 2 + 0.5, height / 2 - 0.2, breadth / 2 - 0.3),
      new THREE.Vector3(length / 2 - 0.5, height / 2 - 0.2, breadth / 2 - 0.3),
      new THREE.Vector3(length / 2 - 0.5, height / 2 - 0.2, -breadth / 2 + 0.3),
      new THREE.Vector3(
        -length / 2 + 0.5,
        height / 2 - 0.2,
        -breadth / 2 + 0.3
      ),
    ];

    // Add connection back to start for loop
    mainPipePoints.push(
      new THREE.Vector3(-length / 2 + 0.5, height / 2 - 0.2, breadth / 2 - 0.3)
    );

    for (let i = 0; i < mainPipePoints.length - 1; i++) {
      // Supply pipe (lower)
      const supplyPipe = createPipeSegment(
        mainPipePoints[i],
        mainPipePoints[i + 1],
        pipeRadius,
        supplyPipeMaterial
      );
      pipeGroup.add(supplyPipe);

      // Return pipe (upper, offset slightly)
      const returnStart = mainPipePoints[i]
        .clone()
        .add(new THREE.Vector3(0, 0.08, 0));
      const returnEnd = mainPipePoints[i + 1]
        .clone()
        .add(new THREE.Vector3(0, 0.08, 0));
      const returnPipe = createPipeSegment(
        returnStart,
        returnEnd,
        pipeRadius,
        returnPipeMaterial
      );
      pipeGroup.add(returnPipe);
    }

    // Add connecting pipes for FCUs
    for (let i = 0; i < numFCUs; i++) {
      let fcuPos;

      if (numFCUs <= 4) {
        // Ceiling mounted FCUs
        const spacing = length / (numFCUs + 1);
        fcuPos = new THREE.Vector3(
          -length / 2 + spacing * (i + 1),
          height / 2 - 0.2,
          0
        );

        // Create vertical drop pipes to FCU
        const supplyDropStart = new THREE.Vector3(
          fcuPos.x,
          height / 2 - 0.2,
          breadth / 2 - 0.3
        );
        const supplyDropEnd = new THREE.Vector3(
          fcuPos.x,
          height / 2 - 0.2,
          fcuPos.z + 0.2
        );
        const supplyDrop = createPipeSegment(
          supplyDropStart,
          supplyDropEnd,
          pipeRadius,
          supplyPipeMaterial
        );
        pipeGroup.add(supplyDrop);

        const returnDropStart = new THREE.Vector3(
          fcuPos.x,
          height / 2 - 0.12,
          fcuPos.z + 0.2
        );
        const returnDropEnd = new THREE.Vector3(
          fcuPos.x,
          height / 2 - 0.12,
          -breadth / 2 + 0.3
        );
        const returnDrop = createPipeSegment(
          returnDropStart,
          returnDropEnd,
          pipeRadius,
          returnPipeMaterial
        );
        pipeGroup.add(returnDrop);
      } else {
        // Wall mounted FCUs - more complex pipe routing
        const unitsPerWall = Math.ceil(numFCUs / 4);
        const wallIndex = Math.floor(i / unitsPerWall);
        const posInWall = i % unitsPerWall;

        let nearestMainSupply,
          nearestMainReturn,
          fcuSupplyPoint,
          fcuReturnPoint;

        switch (wallIndex) {
          case 0: // Front wall
            fcuPos = new THREE.Vector3(
              -length / 2 + (length / (unitsPerWall + 1)) * (posInWall + 1),
              height / 4,
              -breadth / 2 + 0.15
            );
            nearestMainSupply = new THREE.Vector3(
              fcuPos.x,
              height / 2 - 0.2,
              -breadth / 2 + 0.3
            );
            nearestMainReturn = new THREE.Vector3(
              fcuPos.x,
              height / 2 - 0.12,
              -breadth / 2 + 0.3
            );
            fcuSupplyPoint = new THREE.Vector3(
              fcuPos.x + 0.2,
              height / 4,
              -breadth / 2 + 0.15
            );
            fcuReturnPoint = new THREE.Vector3(
              fcuPos.x - 0.2,
              height / 4,
              -breadth / 2 + 0.15
            );
            break;
          case 1: // Right wall
            fcuPos = new THREE.Vector3(
              length / 2 - 0.15,
              height / 4,
              -breadth / 2 + (breadth / (unitsPerWall + 1)) * (posInWall + 1)
            );
            nearestMainSupply = new THREE.Vector3(
              length / 2 - 0.5,
              height / 2 - 0.2,
              fcuPos.z
            );
            nearestMainReturn = new THREE.Vector3(
              length / 2 - 0.5,
              height / 2 - 0.12,
              fcuPos.z
            );
            fcuSupplyPoint = new THREE.Vector3(
              length / 2 - 0.15,
              height / 4,
              fcuPos.z + 0.2
            );
            fcuReturnPoint = new THREE.Vector3(
              length / 2 - 0.15,
              height / 4,
              fcuPos.z - 0.2
            );
            break;
          case 2: // Back wall
            fcuPos = new THREE.Vector3(
              length / 2 - (length / (unitsPerWall + 1)) * (posInWall + 1),
              height / 4,
              breadth / 2 - 0.15
            );
            nearestMainSupply = new THREE.Vector3(
              fcuPos.x,
              height / 2 - 0.2,
              breadth / 2 - 0.3
            );
            nearestMainReturn = new THREE.Vector3(
              fcuPos.x,
              height / 2 - 0.12,
              breadth / 2 - 0.3
            );
            fcuSupplyPoint = new THREE.Vector3(
              fcuPos.x - 0.2,
              height / 4,
              breadth / 2 - 0.15
            );
            fcuReturnPoint = new THREE.Vector3(
              fcuPos.x + 0.2,
              height / 4,
              breadth / 2 - 0.15
            );
            break;
          case 3: // Left wall
            fcuPos = new THREE.Vector3(
              -length / 2 + 0.15,
              height / 4,
              breadth / 2 - (breadth / (unitsPerWall + 1)) * (posInWall + 1)
            );
            nearestMainSupply = new THREE.Vector3(
              -length / 2 + 0.5,
              height / 2 - 0.2,
              fcuPos.z
            );
            nearestMainReturn = new THREE.Vector3(
              -length / 2 + 0.5,
              height / 2 - 0.12,
              fcuPos.z
            );
            fcuSupplyPoint = new THREE.Vector3(
              -length / 2 + 0.15,
              height / 4,
              fcuPos.z - 0.2
            );
            fcuReturnPoint = new THREE.Vector3(
              -length / 2 + 0.15,
              height / 4,
              fcuPos.z + 0.2
            );
            break;
          default:
            // Provide default values to avoid undefined
            fcuPos = new THREE.Vector3(0, height / 4, 0);
            nearestMainSupply = new THREE.Vector3(0, height / 2 - 0.2, 0);
            nearestMainReturn = new THREE.Vector3(0, height / 2 - 0.12, 0);
            fcuSupplyPoint = new THREE.Vector3(0.2, height / 4, 0);
            fcuReturnPoint = new THREE.Vector3(-0.2, height / 4, 0);
            break;
        }

        // Create supply pipe from main to FCU
        const supplyDrop = createPipeSegment(
          nearestMainSupply,
          fcuSupplyPoint,
          pipeRadius,
          supplyPipeMaterial
        );
        pipeGroup.add(supplyDrop);

        // Create return pipe from FCU to main
        const returnDrop = createPipeSegment(
          fcuReturnPoint,
          nearestMainReturn,
          pipeRadius,
          returnPipeMaterial
        );
        pipeGroup.add(returnDrop);
      }
    }

    // Create connection to chiller (outside the room)
    const chillerSupplyStart = new THREE.Vector3(
      -length / 2 + 0.5,
      height / 2 - 0.2,
      breadth / 2 - 0.3
    );
    const chillerSupplyEnd = new THREE.Vector3(
      -length / 2 - 1,
      height / 2 - 0.2,
      breadth / 2 - 0.3
    );
    const chillerSupply = createPipeSegment(
      chillerSupplyStart,
      chillerSupplyEnd,
      pipeRadius * 1.5, // Slightly larger main pipe
      supplyPipeMaterial
    );
    pipeGroup.add(chillerSupply);

    const chillerReturnStart = new THREE.Vector3(
      -length / 2 + 0.5,
      height / 2 - 0.12,
      breadth / 2 - 0.3
    );
    const chillerReturnEnd = new THREE.Vector3(
      -length / 2 - 1,
      height / 2 - 0.12,
      breadth / 2 - 0.3
    );
    const chillerReturn = createPipeSegment(
      chillerReturnStart,
      chillerReturnEnd,
      pipeRadius * 1.5,
      returnPipeMaterial
    );
    pipeGroup.add(chillerReturn);

    roomGroup.add(pipeGroup);

    // Store reference for animations
    electricalConduitRef.current = pipeGroup;
  };

  // Helper to create pipe segment between two points
  const createPipeSegment = (startPoint, endPoint, radius, material) => {
    if (!startPoint || !endPoint) {
      console.error("Invalid pipe points:", { startPoint, endPoint });
      return new THREE.Group(); // Return empty group instead of throwing error
    }

    const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
    const length = direction.length();

    const pipeGeometry = new THREE.CylinderGeometry(
      radius,
      radius,
      length,
      8,
      1,
      false
    );

    // Shift the geometry so one end is at origin
    pipeGeometry.translate(0, length / 2, 0);

    const pipe = new THREE.Mesh(pipeGeometry, material);

    // Position at start point
    pipe.position.copy(startPoint);

    // Orient towards end point
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
    pipe.setRotationFromQuaternion(quaternion);

    return pipe;
  };

  // Create outdoor unit (chiller)
  const createOutdoorUnit = (roomGroup, length, height, breadth) => {
    // Create chiller unit group
    const chillerGroup = new THREE.Group();

    // Get the position where pipes exit the room
    const pipeExitPos = new THREE.Vector3(
      -length / 2 - 1,
      height / 2 - 0.2,
      breadth / 2 - 0.3
    );

    // Main chiller body
    const chillerGeometry = new THREE.BoxGeometry(1.5, 1.2, 1.0);
    const chillerMaterial = new THREE.MeshStandardMaterial({
      color: 0x607d8b,
      roughness: 0.5,
      metalness: 0.7,
    });
    const chiller = new THREE.Mesh(chillerGeometry, chillerMaterial);
    chiller.castShadow = true;
    chillerGroup.add(chiller);

    // Cooling fins
    const finGeometry = new THREE.BoxGeometry(1.5, 0.05, 1.0);
    const finMaterial = new THREE.MeshStandardMaterial({
      color: 0x455a64,
      roughness: 0.4,
    });

    for (let i = 0; i < 8; i++) {
      const fin = new THREE.Mesh(finGeometry, finMaterial);
      fin.position.y = -0.5 + i * 0.12;
      chillerGroup.add(fin);
    }

    // Control panel
    const controlPanelGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.05);
    const controlPanelMaterial = new THREE.MeshStandardMaterial({
      color: 0x263238,
    });
    const controlPanel = new THREE.Mesh(
      controlPanelGeometry,
      controlPanelMaterial
    );
    controlPanel.position.z = 0.53;
    controlPanel.position.x = 0.4;
    controlPanel.position.y = 0.3;
    chillerGroup.add(controlPanel);

    // Display screen
    const displayGeometry = new THREE.PlaneGeometry(0.25, 0.15);
    const displayMaterial = new THREE.MeshBasicMaterial({
      color: isSimulationRunning ? 0x4caf50 : 0x757575,
      emissive: isSimulationRunning ? 0x2e7d32 : 0x424242,
      emissiveIntensity: 0.5,
    });
    const display = new THREE.Mesh(displayGeometry, displayMaterial);
    display.position.z = 0.53;
    display.position.x = 0.4;
    display.position.y = 0.3;
    display.position.z = 0.53;
    chillerGroup.add(display);

    // Add text showing the current chilled water temperature
    if (isSimulationRunning) {
      const waterTemp = hvacParameters.chilledWaterSupplyTemp.toFixed(1);

      // Create status indicators
      for (let i = 0; i < 3; i++) {
        const indicatorGeometry = new THREE.CircleGeometry(0.02, 12);
        const indicatorMaterial = new THREE.MeshBasicMaterial({
          color: i === 0 ? 0xff0000 : i === 1 ? 0xffff00 : 0x00ff00,
        });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.set(0.3 + i * 0.05, 0.22, 0.531);
        chillerGroup.add(indicator);
      }

      // Add pump
      const pumpBodyGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.25, 16);
      const pumpMaterial = new THREE.MeshStandardMaterial({
        color: 0x546e7a,
        metalness: 0.8,
        roughness: 0.2,
      });
      const pumpBody = new THREE.Mesh(pumpBodyGeometry, pumpMaterial);
      pumpBody.rotation.x = Math.PI / 2;
      pumpBody.position.set(-0.5, -0.3, 0.4);
      chillerGroup.add(pumpBody);

      const motorGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.25);
      const motorMaterial = new THREE.MeshStandardMaterial({
        color: 0x455a64,
      });
      const motor = new THREE.Mesh(motorGeometry, motorMaterial);
      motor.position.set(-0.5, -0.1, 0.4);
      chillerGroup.add(motor);
    }

    // Position outside room
    const chillerPos = new THREE.Vector3(
      -length / 2 - 2.0,
      -height / 2 + 0.6,
      breadth / 3
    );
    chillerGroup.position.copy(chillerPos);

    // Add connecting pipes from wall exit to chiller
    const supplyPipeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2196f3,
      metalness: 0.6,
      roughness: 0.2,
      emissive: 0x1976d2,
      emissiveIntensity: 0.2,
    });

    const returnPipeMaterial = new THREE.MeshStandardMaterial({
      color: 0x90caf9,
      metalness: 0.6,
      roughness: 0.2,
      emissive: 0x42a5f5,
      emissiveIntensity: 0.1,
    });

    // Create vertical pipes from wall exit point to ground level
    const verticalSupplyPipe = createPipeSegment(
      pipeExitPos,
      new THREE.Vector3(pipeExitPos.x, chillerPos.y + 0.6, pipeExitPos.z),
      0.045, // Slightly thicker pipe
      supplyPipeMaterial
    );
    roomGroup.add(verticalSupplyPipe);

    const verticalReturnPipe = createPipeSegment(
      new THREE.Vector3(pipeExitPos.x, pipeExitPos.y - 0.08, pipeExitPos.z), // Offset for return pipe
      new THREE.Vector3(pipeExitPos.x, chillerPos.y + 0.4, pipeExitPos.z),
      0.045,
      returnPipeMaterial
    );
    roomGroup.add(verticalReturnPipe);

    // Horizontal pipes to connect to chiller
    const horizontalSupplyPipe = createPipeSegment(
      new THREE.Vector3(pipeExitPos.x, chillerPos.y + 0.6, pipeExitPos.z),
      new THREE.Vector3(chillerPos.x + 0.75, chillerPos.y + 0.6, chillerPos.z),
      0.045,
      supplyPipeMaterial
    );
    roomGroup.add(horizontalSupplyPipe);

    const horizontalReturnPipe = createPipeSegment(
      new THREE.Vector3(pipeExitPos.x, chillerPos.y + 0.4, pipeExitPos.z),
      new THREE.Vector3(chillerPos.x + 0.75, chillerPos.y + 0.4, chillerPos.z),
      0.045,
      returnPipeMaterial
    );
    roomGroup.add(horizontalReturnPipe);

    // Add connection from horizontal pipes to chiller
    const supplyChillerConnector = createPipeSegment(
      new THREE.Vector3(chillerPos.x + 0.75, chillerPos.y + 0.6, chillerPos.z),
      new THREE.Vector3(
        chillerPos.x + 0.75,
        chillerPos.y + 0.6,
        chillerPos.z + 0.5
      ),
      0.045,
      supplyPipeMaterial
    );
    roomGroup.add(supplyChillerConnector);

    const returnChillerConnector = createPipeSegment(
      new THREE.Vector3(chillerPos.x + 0.75, chillerPos.y + 0.4, chillerPos.z),
      new THREE.Vector3(
        chillerPos.x + 0.75,
        chillerPos.y + 0.4,
        chillerPos.z + 0.5
      ),
      0.045,
      returnPipeMaterial
    );
    roomGroup.add(returnChillerConnector);

    roomGroup.add(chillerGroup);
    outdoorUnitRef.current = chillerGroup;
  };

  // Create refrigerant line
  const createElectricalConduit = (roomGroup, length, height, breadth) => {
    // Since we're using a chilled water system, we don't need refrigerant lines
    // The water pipes already handle the connections between indoor and outdoor units
    // This electrical control conduit connects the chiller to all FCUs

    // Calculate FCU positions based on room parameters
    const numFCUs = roomParameters.fanCoilUnits || 1;

    // Create main conduit group
    const conduitGroup = new THREE.Group();

    // First determine all FCU positions - similar to createIndoorUnit
    const fcuPositions = [];

    for (let i = 0; i < numFCUs; i++) {
      let fcuPos;
      if (numFCUs <= 4) {
        // Ceiling mounted FCUs
        const spacing = length / (numFCUs + 1);
        fcuPos = new THREE.Vector3(
          -length / 2 + spacing * (i + 1),
          height / 2 - 0.1, // Just below ceiling
          0
        );
      } else {
        // Wall-mounted FCUs
        const unitsPerWall = Math.ceil(numFCUs / 4);
        const wallIndex = Math.floor(i / unitsPerWall);
        const posInWall = i % unitsPerWall;

        switch (wallIndex) {
          case 0: // Front wall
            fcuPos = new THREE.Vector3(
              -length / 2 + (length / (unitsPerWall + 1)) * (posInWall + 1),
              height / 4,
              -breadth / 2 + 0.15
            );
            break;
          case 1: // Right wall
            fcuPos = new THREE.Vector3(
              length / 2 - 0.15,
              height / 4,
              -breadth / 2 + (breadth / (unitsPerWall + 1)) * (posInWall + 1)
            );
            break;
          case 2: // Back wall
            fcuPos = new THREE.Vector3(
              length / 2 - (length / (unitsPerWall + 1)) * (posInWall + 1),
              height / 4,
              breadth / 2 - 0.15
            );
            break;
          case 3: // Left wall
            fcuPos = new THREE.Vector3(
              -length / 2 + 0.15,
              height / 4,
              breadth / 2 - (breadth / (unitsPerWall + 1)) * (posInWall + 1)
            );
            break;
        }
      }
      fcuPositions.push(fcuPos);
    }

    // Create junction box material
    const junctionMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.7,
      roughness: 0.3,
    });

    // Create conduit material
    const conduitMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.6,
      roughness: 0.4,
    });

    // Create main backbone conduit from chiller to distribution point (ceiling center)
    const chillerPos = new THREE.Vector3(
      -length / 2 - 2.0,
      -height / 2 + 0.6,
      breadth / 3
    );
    const distributionPoint = new THREE.Vector3(0, height / 2 - 0.3, 0);

    // Create backbone path for conduit from chiller to distribution point
    const backbonePoints = [
      // Start at the chiller position
      new THREE.Vector3(chillerPos.x + 0.5, chillerPos.y + 0.3, chillerPos.z),
      // Route up along the wall
      new THREE.Vector3(-length / 2 - 0.5, -height / 2 + 0.9, chillerPos.z),
      new THREE.Vector3(-length / 2 - 0.5, height / 2 - 0.3, chillerPos.z),
      // Route along ceiling to center distribution point
      new THREE.Vector3(-length / 2 + 0.5, height / 2 - 0.3, breadth / 3),
      new THREE.Vector3(0, height / 2 - 0.3, 0),
    ];

    // Create backbone conduit
    const backboneCurve = new THREE.CatmullRomCurve3(backbonePoints);
    const backboneGeometry = new THREE.TubeGeometry(
      backboneCurve,
      64,
      0.02,
      8,
      false
    );
    const backboneTube = new THREE.Mesh(backboneGeometry, conduitMaterial);
    conduitGroup.add(backboneTube);

    // Add distribution junction box at the center
    const distributionBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.08),
      junctionMaterial
    );
    distributionBox.position.copy(distributionPoint);
    conduitGroup.add(distributionBox);

    // Create individual conduits from distribution point to each FCU
    fcuPositions.forEach((fcuPos, index) => {
      // For ceiling mounted FCUs, create simple vertical drops
      if (numFCUs <= 4) {
        const conduitPoints = [
          distributionPoint,
          new THREE.Vector3(fcuPos.x, height / 2 - 0.3, fcuPos.z),
          new THREE.Vector3(fcuPos.x - 0.3, fcuPos.y, fcuPos.z),
        ];

        const conduitCurve = new THREE.CatmullRomCurve3(conduitPoints);
        const conduitGeometry = new THREE.TubeGeometry(
          conduitCurve,
          32,
          0.015,
          8,
          false
        );
        const conduitTube = new THREE.Mesh(conduitGeometry, conduitMaterial);
        conduitGroup.add(conduitTube);
      } else {
        // For wall-mounted units, create routes to each wall
        const unitsPerWall = Math.ceil(numFCUs / 4);
        const wallIndex = Math.floor(index / unitsPerWall);

        let wallConnectionPoint;

        // Create mid-points to route conduits along walls
        switch (wallIndex) {
          case 0: // Front wall
            wallConnectionPoint = new THREE.Vector3(
              fcuPos.x,
              height / 2 - 0.3,
              -breadth / 2 + 0.3
            );
            break;
          case 1: // Right wall
            wallConnectionPoint = new THREE.Vector3(
              length / 2 - 0.3,
              height / 2 - 0.3,
              fcuPos.z
            );
            break;
          case 2: // Back wall
            wallConnectionPoint = new THREE.Vector3(
              fcuPos.x,
              height / 2 - 0.3,
              breadth / 2 - 0.3
            );
            break;
          case 3: // Left wall
            wallConnectionPoint = new THREE.Vector3(
              -length / 2 + 0.3,
              height / 2 - 0.3,
              fcuPos.z
            );
            break;
        }

        // First, create a route from distribution point to wall connection point
        const routeToWall = [distributionPoint, wallConnectionPoint];

        const wallRouteCurve = new THREE.CatmullRomCurve3(routeToWall);
        const wallRouteGeometry = new THREE.TubeGeometry(
          wallRouteCurve,
          24,
          0.015,
          8,
          false
        );
        const wallRouteTube = new THREE.Mesh(
          wallRouteGeometry,
          conduitMaterial
        );
        conduitGroup.add(wallRouteTube);

        // Then create drop to FCU
        const dropToFCU = [
          wallConnectionPoint,
          new THREE.Vector3(fcuPos.x, height / 2 - 0.3, fcuPos.z),
          new THREE.Vector3(fcuPos.x - 0.35, fcuPos.y, fcuPos.z),
        ];

        const dropCurve = new THREE.CatmullRomCurve3(dropToFCU);
        const dropGeometry = new THREE.TubeGeometry(
          dropCurve,
          16,
          0.012,
          8,
          false
        );
        const dropTube = new THREE.Mesh(dropGeometry, conduitMaterial);
        conduitGroup.add(dropTube);
      }

      // Add junction box at each FCU
      const junctionGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.04);
      const junction = new THREE.Mesh(junctionGeometry, junctionMaterial);
      junction.position.copy(fcuPos);
      junction.position.x -= 0.35; // Offset to place it next to the FCU
      conduitGroup.add(junction);
    });

    roomGroup.add(conduitGroup);
    electricalConduitRef.current = conduitGroup;
  };

  // Temperature color helper
  const getTemperatureColor = (temp) => {
    const minTemp = Math.min(
      roomParameters.targetTemp - 5,
      systemStatus?.roomTemperature - 5 || 20
    );
    const maxTemp = Math.max(
      roomParameters.externalTemp + 5,
      systemStatus?.roomTemperature + 5 || 30
    );
    const range = maxTemp - minTemp;

    // Normalize temperature to 0-1 range
    const normalized = Math.max(0, Math.min(1, (temp - minTemp) / range));

    // Create color: blue (cool) to red (hot)
    if (roomParameters.mode === "cooling") {
      // Blue (cold) to red (hot)
      const r = Math.min(255, Math.max(0, Math.floor(normalized * 255)));
      const b = Math.min(255, Math.max(0, Math.floor((1 - normalized) * 255)));
      const g = Math.min(
        255,
        Math.max(
          0,
          Math.floor(
            (normalized < 0.5 ? normalized * 2 : 2 - normalized * 2) * 150
          )
        )
      );
      return new THREE.Color(r / 255, g / 255, b / 255);
    } else {
      // Red (hot) to blue (cold) for heating mode
      const r = Math.min(255, Math.max(0, Math.floor((1 - normalized) * 255)));
      const b = Math.min(255, Math.max(0, Math.floor(normalized * 255)));
      const g = Math.min(
        255,
        Math.max(
          0,
          Math.floor(
            (normalized < 0.5 ? normalized * 2 : 2 - normalized * 2) * 150
          )
        )
      );
      return new THREE.Color(r / 255, g / 255, b / 255);
    }
  };

  // Create heatmap visualization
  const createHeatmap = () => {
    if (!sceneRef.current || !roomRef.current) return;

    // Clear old heatmap
    if (heatmapRef.current.length > 0) {
      heatmapRef.current.forEach((mesh) => {
        if (roomRef.current) roomRef.current.remove(mesh);
      });
      heatmapRef.current = [];
    }

    const { length, breadth, height } = roomParameters;
    const gridSize = 8; // Number of grid cells in each dimension

    const cellSizeX = length / gridSize;
    const cellSizeZ = breadth / gridSize;
    const cellSizeY = height / gridSize;

    // AC unit position (top middle of the room)
    const acX = 0;
    const acY = height / 2 - 0.5;
    const acZ = -breadth / 2 + 0.15;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        for (let k = 0; k < gridSize; k++) {
          const x = (i - gridSize / 2) * cellSizeX + cellSizeX / 2;
          const y = (k - gridSize / 2) * cellSizeY + cellSizeY / 2;
          const z = (j - gridSize / 2) * cellSizeZ + cellSizeZ / 2;

          // Calculate distance from AC unit
          const distFromAC = Math.sqrt(
            Math.pow(x - acX, 2) + Math.pow(y - acY, 2) + Math.pow(z - acZ, 2)
          );

          // Calculate temperature based on distance and system parameters
          const maxDist = Math.sqrt(
            Math.pow(length, 2) + Math.pow(height, 2) + Math.pow(breadth, 2)
          );
          const distFactor = distFromAC / maxDist;

          // Account for air stratification (hot air rises, cold air falls)
          const heightFactor = (y + height / 2) / height; // 0 at floor, 1 at ceiling

          let cellTemp;
          const roomTemp =
            systemStatus?.roomTemperature || roomParameters.currentTemp;
          const targetTemp = roomParameters.targetTemp;
          const fanEffect =
            ((hvacParameters.fanSpeed / 100) * hvacParameters.power) / 5;

          if (roomParameters.mode === "cooling") {
            // In cooling mode, cold air tends to fall
            const stratification = heightFactor * 2; // Higher temperature at ceiling
            cellTemp =
              roomTemp -
              (roomTemp - targetTemp) *
                (1 - Math.pow(distFactor, 1.5)) *
                fanEffect *
                (1.5 - stratification * 0.5); // Less effective at floor
          } else {
            // In heating mode, warm air rises
            const stratification = (1 - heightFactor) * 2; // Higher temperature at ceiling
            cellTemp =
              roomTemp +
              (targetTemp - roomTemp) *
                (1 - Math.pow(distFactor, 1.5)) *
                fanEffect *
                (1.5 - stratification * 0.5); // More effective at ceiling
          }

          // Create heat cell (cube)
          const cellGeometry = new THREE.BoxGeometry(
            cellSizeX * 0.9,
            cellSizeY * 0.9,
            cellSizeZ * 0.9
          );
          const cellMaterial = new THREE.MeshBasicMaterial({
            color: getTemperatureColor(cellTemp),
            transparent: true,
            opacity: 0.1, // More subtle effect
          });

          const cell = new THREE.Mesh(cellGeometry, cellMaterial);
          cell.position.set(x, y, z);
          cell.userData = { temperature: cellTemp };

          roomRef.current.add(cell);
          heatmapRef.current.push(cell);
        }
      }
    }
  };

  // Update heatmap based on current temperature
  useEffect(() => {
    if (heatmapRef.current.length > 0 && systemStatus) {
      heatmapRef.current.forEach((cell) => {
        // Get distance from AC unit to recalculate temperature
        const { length, breadth, height } = roomParameters;
        const acX = 0;
        const acY = height / 2 - 0.5;
        const acZ = -breadth / 2 + 0.15;

        const distFromAC = Math.sqrt(
          Math.pow(cell.position.x - acX, 2) +
            Math.pow(cell.position.y - acY, 2) +
            Math.pow(cell.position.z - acZ, 2)
        );

        const maxDist = Math.sqrt(
          Math.pow(length, 2) + Math.pow(height, 2) + Math.pow(breadth, 2)
        );
        const distFactor = distFromAC / maxDist;

        // Account for air stratification (hot air rises, cold air falls)
        const heightFactor = (cell.position.y + height / 2) / height; // 0 at floor, 1 at ceiling

        let cellTemp;
        const roomTemp = systemStatus.roomTemperature;
        const targetTemp = roomParameters.targetTemp;
        const fanEffect =
          ((hvacParameters.fanSpeed / 100) * hvacParameters.power) / 5;

        if (roomParameters.mode === "cooling") {
          // In cooling mode, cold air tends to fall
          const stratification = heightFactor * 2; // Higher temperature at ceiling
          cellTemp =
            roomTemp -
            (roomTemp - targetTemp) *
              (1 - Math.pow(distFactor, 1.5)) *
              fanEffect *
              (1.5 - stratification * 0.5); // Less effective at floor
        } else {
          // In heating mode, warm air rises
          const stratification = (1 - heightFactor) * 2; // Higher temperature at ceiling
          cellTemp =
            roomTemp +
            (targetTemp - roomTemp) *
              (1 - Math.pow(distFactor, 1.5)) *
              fanEffect *
              (1.5 - stratification * 0.5); // More effective at ceiling
        }

        // Update cell color based on temperature
        if (cell.material) {
          cell.material.color = getTemperatureColor(cellTemp);
          cell.userData.temperature = cellTemp;
        }
      });
    }
  }, [
    systemStatus?.roomTemperature,
    roomParameters.targetTemp,
    roomParameters.mode,
    hvacParameters.fanSpeed,
    hvacParameters.power,
  ]);

  // Create airflow particles
  // Replace createAirflowParticles with this enhanced version

  const createAirflowParticles = () => {
    if (!sceneRef.current || !roomRef.current) return;

    // Clear old particles
    if (airflowParticlesRef.current.length > 0) {
      airflowParticlesRef.current.forEach((particle) => {
        // Also remove trails if they exist
        if (particle.userData.trail) {
          particle.userData.trail.forEach((trail) => {
            if (roomRef.current) roomRef.current.remove(trail);
          });
        }
        if (roomRef.current) roomRef.current.remove(particle);
      });
      airflowParticlesRef.current = [];
    }

    const { length, breadth, height } = roomParameters;
    const roomSize = Math.min(length, breadth, height);
    const particleSize = roomSize * 0.012; // Larger particles

    // Adjust number of particles based on room size and airflow
    const baseParticles = 20; // Minimum number
    const numParticles =
      baseParticles + Math.floor(hvacParameters.airFlowRate * 30);

    // Create particle material based on mode with glow effect
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: roomParameters.mode === "cooling" ? 0x00ccff : 0xff8844,
      transparent: true,
      opacity: 0.8,
      emissive: roomParameters.mode === "cooling" ? 0x0088ff : 0xff6622,
      emissiveIntensity: 0.5,
    });

    // Group for all particles
    const particleGroup = new THREE.Group();
    roomRef.current.add(particleGroup);

    const numFCUs = roomParameters.fanCoilUnits || 1;
    const fcuPositions = [];

    // Generate FCU positions (matching logic in createIndoorUnit)
    for (let i = 0; i < numFCUs; i++) {
      let fcuPos = new THREE.Vector3();
      let direction = new THREE.Vector3();

      if (numFCUs <= 4) {
        // Ceiling mounted FCUs
        const spacing = length / (numFCUs + 1);
        fcuPos.set(
          -length / 2 + spacing * (i + 1),
          height / 2 - 0.25, // Just below ceiling
          0
        );
        direction.set(0, -1, 0); // Pointing down
      } else {
        // Wall-mounted FCUs
        const unitsPerWall = Math.ceil(numFCUs / 4);
        const wallIndex = Math.floor(i / unitsPerWall);
        const posInWall = i % unitsPerWall;

        switch (wallIndex) {
          case 0: // Front wall
            fcuPos.set(
              -length / 2 + (length / (unitsPerWall + 1)) * (posInWall + 1),
              height / 4,
              -breadth / 2 + 0.25
            );
            direction.set(0, 0, 1); // Facing into room
            break;
          case 1: // Right wall
            fcuPos.set(
              length / 2 - 0.25,
              height / 4,
              -breadth / 2 + (breadth / (unitsPerWall + 1)) * (posInWall + 1)
            );
            direction.set(-1, 0, 0); // Facing into room
            break;
          case 2: // Back wall
            fcuPos.set(
              length / 2 - (length / (unitsPerWall + 1)) * (posInWall + 1),
              height / 4,
              breadth / 2 - 0.25
            );
            direction.set(0, 0, -1); // Facing into room
            break;
          case 3: // Left wall
            fcuPos.set(
              -length / 2 + 0.25,
              height / 4,
              breadth / 2 - (breadth / (unitsPerWall + 1)) * (posInWall + 1)
            );
            direction.set(1, 0, 0); // Facing into room
            break;
        }
      }

      fcuPositions.push({ position: fcuPos, direction: direction });
    }

    // Generate particles spread across all FCUs
    for (let i = 0; i < numParticles; i++) {
      const particleGeometry = new THREE.SphereGeometry(particleSize, 8, 8);
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);

      // Select which FCU this particle will come from (distribute evenly)
      const fcuIndex = i % fcuPositions.length;
      const fcuData = fcuPositions[fcuIndex];

      // Add some randomization to starting position
      const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.4
      );

      // Set particle position to selected FCU with randomization
      const startPos = fcuData.position.clone().add(randomOffset);
      particle.position.copy(startPos);

      // Calculate velocity direction based on FCU orientation
      // Add some randomization to the angle
      const spreadAngle = Math.PI / 6; // 30 degree spread
      const randomAngleX = (Math.random() - 0.5) * spreadAngle;
      const randomAngleY = (Math.random() - 0.5) * spreadAngle;

      // Create a new direction vector based on the FCU direction with randomization
      const velDirection = fcuData.direction.clone();

      // Apply random rotation to the direction vector
      if (velDirection.y !== 0) {
        // For ceiling units (pointing down), randomize x and z
        velDirection.x += randomAngleX;
        velDirection.z += randomAngleY;
      } else if (velDirection.x !== 0) {
        // For side wall units, randomize y and z
        velDirection.y += randomAngleX * 0.5;
        velDirection.z += randomAngleY;
      } else {
        // For front/back wall units, randomize x and y
        velDirection.x += randomAngleX;
        velDirection.y += randomAngleY * 0.5;
      }

      velDirection.normalize();

      // Set speed based on fan speed
      const speed =
        (0.02 + Math.random() * 0.03) *
        (Math.max(10, hvacParameters.fanSpeed) / 100);

      // Store velocity as a property on the particle
      particle.userData = {
        velocity: velDirection.multiplyScalar(speed),
        // Life tracking for particles
        life: 0,
        maxLife: 100 + Math.random() * 100,
        // Original starting position
        origin: startPos.clone(),
        // Original direction from FCU (needed for reset)
        sourceDirection: fcuData.direction.clone(),
        // Temperature carried by this particle
        temperature:
          roomParameters.mode === "cooling"
            ? roomParameters.targetTemp - 2
            : roomParameters.targetTemp + 2,
      };

      // Add trail for better visibility
      const trailLength = 5;
      particle.userData.trail = [];

      // Use different colors for first and last trail parts
      const startColor =
        roomParameters.mode === "cooling" ? 0x88ccff : 0xffaa66;
      const endColor = roomParameters.mode === "cooling" ? 0x0055bb : 0xbb4400;

      for (let t = 0; t < trailLength; t++) {
        // Interpolate color between start and end
        const ratio = t / (trailLength - 1);
        const r =
          (1 - ratio) * ((startColor >> 16) & 0xff) +
          ratio * ((endColor >> 16) & 0xff);
        const g =
          (1 - ratio) * ((startColor >> 8) & 0xff) +
          ratio * ((endColor >> 8) & 0xff);
        const b = (1 - ratio) * (startColor & 0xff) + ratio * (endColor & 0xff);
        const color =
          (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

        const trailGeometry = new THREE.SphereGeometry(
          particleSize * (0.8 - t * 0.15), // More aggressive size reduction
          4,
          4
        );
        const trailMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.5 - t * 0.08,
        });
        const trailPart = new THREE.Mesh(trailGeometry, trailMaterial);
        trailPart.position.copy(particle.position);
        particleGroup.add(trailPart);
        particle.userData.trail.push(trailPart);
      }

      particleGroup.add(particle);
      airflowParticlesRef.current.push(particle);
    }

    console.log(
      `Created ${numParticles} airflow particles from ${fcuPositions.length} FCUs`
    );
  };

  // Update airflow particles
  const updateAirflowParticles = () => {
    if (!roomRef.current) return;

    const { length, breadth, height } = roomParameters;
    const halfLength = length / 2;
    const halfBreadth = breadth / 2;
    const halfHeight = height / 2;

    // Number of FCUs to determine reset behavior
    const numFCUs = roomParameters.fanCoilUnits || 1;
    const isCeilingMounted = numFCUs <= 4;

    airflowParticlesRef.current.forEach((particle) => {
      // Apply gravity/buoyancy based on mode
      if (roomParameters.mode === "cooling") {
        // Cold air falls
        particle.userData.velocity.y -= 0.0002;
      } else {
        // Warm air rises
        particle.userData.velocity.y += 0.0002;
      }

      // Update position based on velocity
      particle.position.x += particle.userData.velocity.x;
      particle.position.y += particle.userData.velocity.y;
      particle.position.z += particle.userData.velocity.z;

      // Increment life
      particle.userData.life += 1;

      // Apply drag (air resistance)
      particle.userData.velocity.multiplyScalar(0.99);

      // Fade out as life increases
      if (particle.material) {
        particle.material.opacity =
          0.8 * (1 - particle.userData.life / particle.userData.maxLife);
      }

      // Update trail positions
      if (particle.userData.trail) {
        for (let t = particle.userData.trail.length - 1; t >= 0; t--) {
          if (t === 0) {
            particle.userData.trail[t].position.copy(particle.position);
          } else {
            particle.userData.trail[t].position.copy(
              particle.userData.trail[t - 1].position
            );
          }

          // Update trail opacity based on particle life
          if (particle.userData.trail[t].material) {
            const baseOpacity = 0.5 - t * 0.08;
            particle.userData.trail[t].material.opacity =
              baseOpacity *
              (1 - particle.userData.life / particle.userData.maxLife);
          }
        }
      }

      // Bounce off walls with some energy loss
      const bounceFactor = 0.7;

      // X bounds
      if (
        particle.position.x > halfLength &&
        particle.userData.velocity.x > 0
      ) {
        particle.position.x = halfLength;
        particle.userData.velocity.x =
          -particle.userData.velocity.x * bounceFactor;
      } else if (
        particle.position.x < -halfLength &&
        particle.userData.velocity.x < 0
      ) {
        particle.position.x = -halfLength;
        particle.userData.velocity.x =
          -particle.userData.velocity.x * bounceFactor;
      }

      // Y bounds
      if (
        particle.position.y > halfHeight &&
        particle.userData.velocity.y > 0
      ) {
        particle.position.y = halfHeight;
        particle.userData.velocity.y =
          -particle.userData.velocity.y * bounceFactor;
      } else if (
        particle.position.y < -halfHeight &&
        particle.userData.velocity.y < 0
      ) {
        particle.position.y = -halfHeight;
        particle.userData.velocity.y =
          -particle.userData.velocity.y * bounceFactor;
      }

      // Z bounds
      if (
        particle.position.z > halfBreadth &&
        particle.userData.velocity.z > 0
      ) {
        particle.position.z = halfBreadth;
        particle.userData.velocity.z =
          -particle.userData.velocity.z * bounceFactor;
      } else if (
        particle.position.z < -halfBreadth &&
        particle.userData.velocity.z < 0
      ) {
        particle.position.z = -halfBreadth;
        particle.userData.velocity.z =
          -particle.userData.velocity.z * bounceFactor;
      }

      // Reset particle if reached max life or almost stationary
      const speedSquared = particle.userData.velocity.lengthSq();

      if (
        particle.userData.life > particle.userData.maxLife ||
        speedSquared < 0.00001
      ) {
        // Reset position to origin
        particle.position.copy(particle.userData.origin);

        // Get the base direction from particle's user data
        // This will have been set during creation based on FCU position
        let direction;

        // Extract base direction from origin point
        if (isCeilingMounted) {
          // For ceiling-mounted units, particles should flow predominantly downward
          direction = new THREE.Vector3(0, -1, 0);

          // Add slight horizontal variation for more natural flow pattern
          direction.x = (Math.random() - 0.5) * 0.3; // Small x variation
          direction.z = (Math.random() - 0.5) * 0.3; // Small z variation

          // Ensure the primary direction is still downward
          direction.normalize();
        } else {
          // For wall-mounted units, use the stored direction with more variation
          const sourceDirection =
            particle.userData.sourceDirection || new THREE.Vector3(0, 0, 1); // Default if not set

          // Create a new direction with randomization
          direction = sourceDirection.clone();

          // Add angular variation (30 degree cone)
          const spreadAngle = Math.PI / 6;

          if (
            Math.abs(direction.x) > Math.abs(direction.y) &&
            Math.abs(direction.x) > Math.abs(direction.z)
          ) {
            // X-dominant direction (left/right wall)
            direction.y += (Math.random() - 0.5) * spreadAngle;
            direction.z += (Math.random() - 0.5) * spreadAngle;
          } else if (
            Math.abs(direction.z) > Math.abs(direction.y) &&
            Math.abs(direction.z) > Math.abs(direction.x)
          ) {
            // Z-dominant direction (front/back wall)
            direction.x += (Math.random() - 0.5) * spreadAngle;
            direction.y += (Math.random() - 0.5) * spreadAngle * 0.5;
          }

          direction.normalize();
        }

        // Calculate speed based on fan settings
        const speed =
          (0.02 + Math.random() * 0.03) *
          (Math.max(10, hvacParameters.fanSpeed) / 100);

        // Set new velocity
        particle.userData.velocity = direction.multiplyScalar(speed);

        // Reset life
        particle.userData.life = 0;

        // Reset opacity
        if (particle.material) {
          particle.material.opacity = 0.6;
        }
      }
    });
  };
  // Update airflow when parameters change
  useEffect(() => {
    if (isSimulationRunning && airflowParticlesRef.current.length > 0) {
      // Update particle colors based on mode
      airflowParticlesRef.current.forEach((particle) => {
        if (particle.material) {
          particle.material.color = new THREE.Color(
            roomParameters.mode === "cooling" ? 0x88ccff : 0xffaa66
          );
        }
      });
    }

    // Recreate particles if air flow rate changes significantly
    if (
      Math.abs(
        airflowParticlesRef.current.length - hvacParameters.airFlowRate * 50
      ) > 10
    ) {
      createAirflowParticles();
    }
  }, [
    hvacParameters.fanSpeed,
    hvacParameters.airFlowRate,
    roomParameters.mode,
    isSimulationRunning,
  ]);

  return (
    <Card className="relative w-full bg-background h-96 p-0 p-2">
      {/* Main visualization area */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Status Overlay */}
      <Card className="absolute top-4 left-4 shadow-md z-10 flex justify-center text-center backdrop-blur-sm bg-white/1">
        <CardContent className="px-4">
          <Badge
            variant={
              roomParameters.mode === "cooling" ? "default" : "destructive"
            }
            className="flex justify-center mb-1 w-full"
          >
            {roomParameters.mode === "cooling" ? "Cooling" : "Heating"}
          </Badge>
          <h3 className="text-xl font-bold mb-2">
            {systemStatus?.roomTemperature?.toFixed(1) || "25.0"}°C
          </h3>
          <p className="text-sm text-muted-foreground">
            Target: {roomParameters.targetTemp.toFixed(1)}°C
          </p>
          <div className="flex justify-center items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">
              Fan Speed: {hvacParameters.fanSpeed}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Temperature Color Legend */}
      <Card className="absolute bottom-4 right-4 bg-white/1 backdrop-blur-sm shadow-md z-10 py-4 px-0">
        <CardContent>
          <h4 className="text-sm font-medium mb-2">Temperature</h4>

          <div className="w-full h-4 rounded-sm overflow-hidden">
            <div
              className="h-full w-full"
              style={{
                background:
                  roomParameters.mode === "cooling"
                    ? "linear-gradient(to right, #0066ff, #66ff66, #ff6666)"
                    : "linear-gradient(to right, #ff6666, #66ff66, #0066ff)",
              }}
            />
          </div>

          <div className="flex justify-between mt-1">
            <span className="text-xs">
              {roomParameters.mode === "cooling"
                ? (roomParameters.targetTemp - 5).toFixed(1)
                : (roomParameters.targetTemp + 5).toFixed(1)}
              °C
            </span>
            <span className="text-xs">
              {roomParameters.mode === "cooling"
                ? (roomParameters.externalTemp + 5).toFixed(1)
                : (roomParameters.externalTemp - 5).toFixed(1)}
              °C
            </span>
          </div>
        </CardContent>
      </Card>
    </Card>
  );
};

export default ChilledWaterSystemModel;
