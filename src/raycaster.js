import {Raycaster,Vector2,} from "three";

export default class CustomRayCaster {
  constructor(renderer, camera, scene) {
    this.scene = scene;
    this.container = document.querySelector("#canvas-container");
    this.mousePosition = new Vector2();
    this.rayCaster = new Raycaster();
    this.camera = camera;
    this.mouse = new Vector2();
    this.renderer = renderer;
    this.enableControls();
  }

  selectThumbnail() {
    let arr = this.intersect();
    // console.log(arr);  // Move the console.log here if you want to log the array
    return arr[0];
  }

  enableControls() {
    this.renderer.domElement.addEventListener("mousemove", (e) => {
      this.mouse.x = (e.clientX / this.container.clientWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / this.container.clientHeight) * 2 + 1;

      let arr = this.intersect();
      // Additional logic using arr if needed
    });
  }

  intersect() {
    this.renderer.setRenderTarget(null);
    this.rayCaster.setFromCamera(this.mouse, this.camera);
    this.intersectedObjectsArray = this.rayCaster.intersectObjects(this.scene.children);
    // console.log(this.intersectedObjectsArray, this.scene);

    return this.intersectedObjectsArray;
  }
}
