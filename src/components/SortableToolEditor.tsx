import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ToolEditor } from './ToolEditor';
import { Tool } from '../lib/util/SettingsManager';

interface SortableToolEditorProps {
  tool: Tool;
  onUpdate: (tool: Tool) => void;
  onRemove: () => void;
  errors: string[];
}

export const SortableToolEditor: React.FC<SortableToolEditorProps> = ({
  tool,
  onUpdate,
  onRemove,
  errors
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `tool-${tool.order}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`draggable-tool ${isDragging ? 'dragging' : ''}`}
    >
      <div className="drag-handle" {...attributes} {...listeners}>
        <span className="drag-icon">⋮⋮</span>
      </div>
      <div className="tool-content-wrapper">
        <ToolEditor
          tool={tool}
          onUpdate={onUpdate}
          onRemove={onRemove}
          errors={errors}
        />
      </div>
    </div>
  );
};
