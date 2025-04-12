import React, { useRef, useState, useEffect } from "react";
import Moveable from "react-moveable";
import { X } from "lucide-react";

const DraggableBox = ({ data = "No data available", onClose }) => {
  const targetRef = useRef(null);
  const [width, setWidth] = useState(320);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (targetRef.current) {
      setTarget(targetRef.current);
    }
  }, [targetRef]);

  return (
    <>
      <div
        ref={targetRef}
        className="fixed z-50 p-4 rounded-xl shadow-lg border border-input dark:bg-background/60 bg-background/85 text-primary"
        style={{
          top: `${position.y}px`,
          left: `${position.x}px`,
          width: `${width}px`,
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          transition: "box-shadow 0.2s ease",
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">Failure Log</span>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-input rounded-md">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto max-h-[300px]">{data}</div>
      </div>

      {target && (
        <Moveable
          target={target}
          draggable={true}
          resizable={true}
          keepRatio={false}
          throttleResize={1}
          edge={false}
          renderDirections={["e", "w"]}
          snappable={true}
          origin={false}
          onDragStart={({ set }) => {
            set([position.x, position.y]);
          }}
          onDrag={({ target, beforeTranslate }) => {
            target.style.left = `${beforeTranslate[0]}px`;
            target.style.top = `${beforeTranslate[1]}px`;

            setPosition({ x: beforeTranslate[0], y: beforeTranslate[1] });
          }}
          onResize={({ target, width, drag }) => {
            target.style.width = `${width}px`;
            target.style.left = `${drag.beforeTranslate[0]}px`;
            target.style.top = `${drag.beforeTranslate[1]}px`;

            setWidth(width);
            setPosition({
              x: drag.beforeTranslate[0],
              y: drag.beforeTranslate[1],
            });
          }}
          props={{
            className: "custom-moveable",
          }}
        />
      )}
    </>
  );
};

export default DraggableBox;
