import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GlobalParameterEditor } from './GlobalParameterEditor';
import { GlobalParameter } from '../lib/util/SettingsManager';

interface SortableGlobalParameterEditorProps {
  parameter: GlobalParameter;
  onUpdate: (parameter: GlobalParameter) => void;
  onRemove: () => void;
  errors: string[];
}

export const SortableGlobalParameterEditor: React.FC<SortableGlobalParameterEditorProps> = ({
  parameter,
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
  } = useSortable({ id: `param-${parameter.order}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-parameter ${isDragging ? 'dragging' : ''}`}
    >
      <div className="drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>
      <div className="parameter-wrapper">
        <GlobalParameterEditor
          parameter={parameter}
          onUpdate={onUpdate}
          onRemove={onRemove}
          errors={errors}
        />
      </div>
    </div>
  );
};
