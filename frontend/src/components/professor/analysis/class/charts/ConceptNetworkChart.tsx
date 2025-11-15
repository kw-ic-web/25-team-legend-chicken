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
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
      <h2 className="text-xl font-bold text-gray-900 mb-6">개념 네트워크</h2>
      <div className="flex justify-center bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6">
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
                strokeWidth={conn.thickness * 2.5}
                opacity={0.5}
                strokeLinecap="round"
              />
            );
          })}

          {/* 노드 */}
          {nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r="45"
                fill="#e9d5ff"
                stroke="#a855f7"
                strokeWidth="3"
                className="hover:fill-purple-200 transition-colors cursor-pointer"
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm font-semibold fill-gray-900 pointer-events-none"
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
        <p className="text-sm text-gray-700 text-center font-medium">
          {description}
        </p>
      </div>
    </div>
  );
};

export default ConceptNetworkChart;
