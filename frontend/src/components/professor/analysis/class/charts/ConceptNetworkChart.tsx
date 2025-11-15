import React from "react";

interface ConceptNode {
  id: string;
  label: string;
  x: number;
  y: number;
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
  const getNodeById = (id: string) => nodes.find((n) => n.id === id);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        개념 네트워크
      </h2>
      <div className="flex justify-center">
        <svg width="400" height="300" className="mx-auto">
          {/* 연결선 */}
          {connections.map((conn, index) => {
            const fromNode = getNodeById(conn.from);
            const toNode = getNodeById(conn.to);
            if (!fromNode || !toNode) return null;

            return (
              <line
                key={index}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#a855f7"
                strokeWidth={conn.thickness * 2}
                opacity={0.6}
              />
            );
          })}

          {/* 노드 */}
          {nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r="40"
                fill="#e9d5ff"
                stroke="#a855f7"
                strokeWidth="2"
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm font-medium fill-gray-900"
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <p className="text-sm text-gray-600 mt-4 text-center">{description}</p>
    </div>
  );
};

export default ConceptNetworkChart;
