import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { updatePlaceTimeline } from '../services/placeService';
import toast from 'react-hot-toast';

interface Place {
    id: number;
    name: string;
    description?: string;
    category?: string;
    address?: string;
    visit_date?: string | null;
    visit_time?: string | null;
    visit_order?: number;
}

interface TimelineProps {
    places: Place[];
    tripId: number;
    onUpdate: () => void;
}

// Компонент для перетаскиваемого элемента
const SortableItem: React.FC<{ place: Place; onDateChange: (id: number, date: string, time: string) => void }> = ({ place, onDateChange }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: place.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
    };

    const getCategoryIcon = (category?: string) => {
        switch (category) {
            case 'attraction': return '🏛️';
            case 'restaurant': return '🍽️';
            case 'hotel': return '🏨';
            case 'transport': return '🚗';
            default: return '📍';
        }
    };

    // Преобразуем YYYY-MM-DD в DD.MM.YYYY для отображения
    const formatDisplayDate = (dateStr?: string | null) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
    };

    // Значение для input type="date" должно быть в формате YYYY-MM-DD
    const dateValue = place.visit_date || '';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white border rounded-lg p-4 mb-2 shadow-sm hover:shadow-md transition ${isDragging ? 'shadow-lg border-blue-300' : ''
                }`}
        >
            <div className="flex items-start gap-4">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-move p-2 text-gray-400 hover:text-gray-600"
                >
                    ⠿⠿
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{getCategoryIcon(place.category)}</span>
                        <h3 className="font-bold text-gray-800">{place.name}</h3>
                        {place.visit_date && (
                            <span className="text-sm text-gray-500 ml-2">
                                ({formatDisplayDate(place.visit_date)})
                            </span>
                        )}
                    </div>

                    {place.address && (
                        <p className="text-sm text-gray-500 mt-1">{place.address}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Дата</label>
                            <input
                                type="date"
                                value={dateValue}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onDateChange(place.id, e.target.value, place.visit_time || '');
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Время</label>
                            <div className="flex gap-1">
                                <select
                                    value={place.visit_time ? place.visit_time.split(':')[0] : ''}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        const hours = e.target.value;
                                        const minutes = place.visit_time ? place.visit_time.split(':')[1] || '00' : '00';
                                        const newTime = `${hours}:${minutes}`;
                                        onDateChange(place.id, place.visit_date || '', newTime);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">ЧЧ</option>
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={i.toString().padStart(2, '0')}>
                                            {i.toString().padStart(2, '0')}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-sm py-1">:</span>
                                <select
                                    value={place.visit_time ? place.visit_time.split(':')[1] || '' : ''}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        const hours = place.visit_time ? place.visit_time.split(':')[0] || '00' : '00';
                                        const minutes = e.target.value;
                                        const newTime = `${hours}:${minutes}`;
                                        onDateChange(place.id, place.visit_date || '', newTime);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">ММ</option>
                                    {Array.from({ length: 60 }, (_, i) => (
                                        <option key={i} value={i.toString().padStart(2, '0')}>
                                            {i.toString().padStart(2, '0')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Timeline: React.FC<TimelineProps> = ({ places, tripId, onUpdate }) => {
    // Нормализуем входные данные
    const normalizedPlaces = places.map(p => ({
        ...p,
        visit_date: p.visit_date ? p.visit_date.split('T')[0] : null
    }));

    const [items, setItems] = useState(() =>
        [...normalizedPlaces].sort((a, b) => (a.visit_order || 0) - (b.visit_order || 0))
    );

    // Обновляем items при изменении places (когда переключаемся между днями)
    useEffect(() => {
        setItems([...normalizedPlaces].sort((a, b) => (a.visit_order || 0) - (b.visit_order || 0)));
    }, [places]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDateChange = async (placeId: number, date: string, time: string) => {
        console.log('📝 Отправка данных:', { placeId, date, time });

        try {
            const updates: any = {};
            if (date !== undefined) updates.visit_date = date || null;
            if (time !== undefined) updates.visit_time = time || null;

            await updatePlaceTimeline(tripId, placeId, updates);

            setItems(prev =>
                prev.map(p => {
                    if (p.id === placeId) {
                        return {
                            ...p,
                            visit_date: date !== undefined ? date : p.visit_date,
                            visit_time: time !== undefined ? time : p.visit_time
                        };
                    }
                    return p;
                })
            );

            onUpdate();
            toast.success('Обновлено');
        } catch (error: any) {
            console.error('❌ Ошибка:', error);
            toast.error('Ошибка при обновлении');
        }
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = items.findIndex((i) => i.id === active.id);
            const newIndex = items.findIndex((i) => i.id === over.id);

            const newItems = arrayMove(items, oldIndex, newIndex);
            setItems(newItems);

            try {
                for (let i = 0; i < newItems.length; i++) {
                    await updatePlaceTimeline(tripId, newItems[i].id, { visit_order: i });
                }
                toast.success('Порядок обновлен');
            } catch (error) {
                toast.error('Ошибка при сохранении порядка');
                setItems(items);
            }
        }
    };

    // Группируем по датам
    const groupedByDate = items.reduce((acc, place) => {
        const dateKey = place.visit_date || 'Без даты';
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(place);
        return acc;
    }, {} as Record<string, Place[]>);

    // 👇 СОРТИРУЕМ МЕСТА ПО ВРЕМЕНИ ВНУТРИ КАЖДОЙ ГРУППЫ
    Object.keys(groupedByDate).forEach(date => {
        groupedByDate[date].sort((a, b) => {
            if (!a.visit_time) return 1;
            if (!b.visit_time) return -1;
            return a.visit_time.localeCompare(b.visit_time);
        });
    });

    // Сортируем даты
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        if (a === 'Без даты') return 1;
        if (b === 'Без даты') return -1;
        return a.localeCompare(b);
    });

    const formatDateHeader = (dateStr: string) => {
        if (dateStr === 'Без даты') return '📅 Не запланировано';
        const [year, month, day] = dateStr.split('-');
        if (!year || !month || !day) return dateStr;
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        return `📅 ${parseInt(day)} ${months[parseInt(month) - 1]} ${year} г.`;
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Нет мест для отображения</p>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-6">
                {sortedDates.map(date => (
                    <div key={date} className="bg-gray-50 rounded-xl p-4">
                        <h3 className="font-semibold text-gray-700 mb-3">
                            {formatDateHeader(date)}
                        </h3>
                        <SortableContext
                            items={groupedByDate[date].map(p => p.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {groupedByDate[date].map(place => (
                                    <SortableItem
                                        key={place.id}
                                        place={place}
                                        onDateChange={handleDateChange}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </div>
                ))}
            </div>
        </DndContext>
    );
};

export default Timeline;