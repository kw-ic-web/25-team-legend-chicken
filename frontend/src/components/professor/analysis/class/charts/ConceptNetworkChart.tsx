import React, { useMemo, useRef } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ForceGraph3D from "react-force-graph-3d";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as THREE from "three";

interface ConceptNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
}

interface ConceptConnection {
  from: string;
  to: string;
  thickness: number; // 연결 두께 (혼동 정도)
}

interface ConceptNetworkChartProps {
  nodes: ConceptNode[];
  connections: ConceptConnection[];
  description: string;
}

const ConceptNetworkChart: React.FC<ConceptNetworkChartProps> = ({
  nodes,
  connections,
  description,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  const graphData = useMemo(() => {
    const graphNodes = nodes.map((node) => ({
      id: node.id,
      name: node.label,
    }));

    const graphLinks = connections.map((conn) => ({
      source: conn.from,
      target: conn.to,
      value: conn.thickness,
    }));

    return {
      nodes: graphNodes,
      links: graphLinks,
    };
  }, [nodes, connections]);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
      <h2 className="text-xl font-bold text-gray-900 mb-2">개념 네트워크</h2>
      <div className="flex justify-center rounded-lg pb-2 overflow-hidden">
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          width={500}
          height={350}
          backgroundColor="#ffffff"
          nodeLabel="name"
          nodeColor={() => "#9333ea"}
          nodeVal={() => 12}
          linkColor={() => "#c4b5fd"}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linkWidth={(link: any) => (link.value as number) * 0.8 + 0.5}
          linkOpacity={0.9}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linkThreeObject={(link: any) => {
            // 연결선의 renderOrder를 낮춰서 이름 카드보다 먼저 렌더링되도록
            const material = new THREE.LineBasicMaterial({
              color: "#c4b5fd",
              opacity: 0.9,
              transparent: true,
            });
            const geometry = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(
                link.source?.x || 0,
                link.source?.y || 0,
                link.source?.z || 0
              ),
              new THREE.Vector3(
                link.target?.x || 0,
                link.target?.y || 0,
                link.target?.z || 0
              ),
            ]);
            const line = new THREE.Line(geometry, material);
            line.renderOrder = 0; // 이름 카드보다 먼저 렌더링
            return line;
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeThreeObject={(node: any) => {
            const sprite = new THREE.Sprite(
              new THREE.SpriteMaterial({
                map: (() => {
                  const canvas = document.createElement("canvas");
                  canvas.width = 320;
                  canvas.height = 80;
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    const nodeName = (node as { name: string }).name;

                    // 배경 사각형 그리기 (진한 보라색)
                    ctx.fillStyle = "#9333ea";
                    ctx.fillRect(0, 0, 320, 80);

                    // 테두리 그리기
                    ctx.strokeStyle = "#7c3aed";
                    ctx.lineWidth = 4;
                    ctx.strokeRect(2, 2, 316, 76);

                    // 텍스트 외곽선 (가독성 향상)
                    ctx.strokeStyle = "#000000";
                    ctx.lineWidth = 4;
                    ctx.font = "bold 28px Arial, Sans-Serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.strokeText(nodeName, 160, 40);

                    // 텍스트 그리기 (흰색)
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 28px Arial, Sans-Serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(nodeName, 160, 40);
                  }
                  const texture = new THREE.CanvasTexture(canvas);
                  return texture;
                })(),
                transparent: false,
                opacity: 1.0,
                depthTest: false,
                depthWrite: false,
              })
            );
            sprite.scale.set(35, 8, 1);
            sprite.renderOrder = 9999; // 다른 객체들(연결선 포함)보다 나중에 렌더링

            // 그룹으로 만들어서 항상 앞에 렌더링
            const group = new THREE.Group();
            group.add(sprite);
            group.renderOrder = 9999;
            return group;
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onNodeHover={(node: any) => {
            if (node) {
              document.body.style.cursor = "pointer";
            } else {
              document.body.style.cursor = "default";
            }
          }}
          cooldownTicks={100}
          onEngineStop={() => {
            // 애니메이션 완료 후 처리
          }}
          showNavInfo={false}
        />
      </div>

      <div className="mt-2 p-4 bg-purple-50 rounded-lg border border-purple-100">
        <p className="text-sm text-gray-700 text-center font-medium">
          {description}
        </p>
      </div>
    </div>
  );
};

export default ConceptNetworkChart;
