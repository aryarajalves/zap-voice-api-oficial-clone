import React from 'react';
import ScheduleCalendar from '../components/ScheduleCalendar';

const SchedulePage = () => {
    return (
        <div className="h-full flex flex-col gap-4">

            <div className="flex-1 min-h-0">
                <ScheduleCalendar />
            </div>
        </div>
    );
};

export default SchedulePage;
