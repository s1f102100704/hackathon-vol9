import type { DragEndEvent } from '@dnd-kit/core';
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TravelSpot } from 'common/types/travelSpots';
import { useRouter } from 'next/router';
import type React from 'react';
import styles from './SelectedTravelSpots.module.css';

type SelectedTravelSpotsProps = {
  selectedSpots: TravelSpot[];
  setTravelSpots: React.Dispatch<React.SetStateAction<TravelSpot[]>>;
  onBackPage?: () => void;
  buttonType?: 'travelSpotList' | 'sightseeingMap';
};

const SelectedTravelSpots: React.FC<SelectedTravelSpotsProps> = ({
  selectedSpots,
  setTravelSpots,
  onBackPage,
  buttonType = 'travelSpotList',
}) => {
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = selectedSpots.findIndex((spot) => spot.name === active.id);
      const newIndex = selectedSpots.findIndex((spot) => spot.name === over?.id);

      const newSelectedSpots = arrayMove(selectedSpots, oldIndex, newIndex);

      // インデックスを更新
      const updatedSelectedSpots = newSelectedSpots.map((item: TravelSpot, index: number) => ({
        ...item,
        index,
      }));

      // 全体のスポットリストを更新
      setTravelSpots((prevTravelSpots) =>
        prevTravelSpots.map(
          (spot) => updatedSelectedSpots.find((s: TravelSpot) => s.name === spot.name) || spot,
        ),
      );
    }
  };

  const SortableItem: React.FC<{ spot: TravelSpot }> = ({ spot }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: spot.name,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <li ref={setNodeRef} style={style} {...attributes} {...listeners} className={styles.listItem}>
        <p className={styles.listTitle}>
          {spot.index !== null ? spot.index + 1 : ''}.{spot.name}
        </p>
      </li>
    );
  };

  const handleDecide = () => {
    router.push('/sightseeingMap');
  };

  const handleReset = () => {
    setTravelSpots((prevTravelSpots) =>
      prevTravelSpots.map((spot) => ({ ...spot, isSelected: false, index: null })),
    );
  };

  return (
    <div className={styles.main}>
      <h2>選択されたスポット</h2>
      {buttonType === 'sightseeingMap' ? (
        <div className={styles.backButton}>
          <button onClick={onBackPage} className={styles.button}>
            戻る
          </button>
        </div>
      ) : (
        <div className={styles.buttonGroup}>
          <button onClick={handleDecide} className={styles.button}>
            行き先決定
          </button>

          <button onClick={handleReset} className={styles.button}>
            リセット
          </button>
        </div>
      )}
      <div className={styles.listContainer}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={selectedSpots.map((spot) => spot.name)}>
            <ul>
              {selectedSpots
                .sort((a, b) => (a.index !== null && b.index !== null ? a.index - b.index : 0))
                .map((spot) => (
                  <SortableItem key={spot.name} spot={spot} />
                ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default SelectedTravelSpots;
