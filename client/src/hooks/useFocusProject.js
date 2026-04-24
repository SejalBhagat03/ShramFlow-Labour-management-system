import { useState, useEffect } from 'react';

const FOCUS_PROJECT_KEY = 'shramflow_focus_project_id';

export const useFocusProject = () => {
    const [focusProjectId, setFocusProjectId] = useState(() => {
        return localStorage.getItem(FOCUS_PROJECT_KEY) || null;
    });

    const setFocus = (id) => {
        if (id) {
            localStorage.setItem(FOCUS_PROJECT_KEY, id);
            setFocusProjectId(id);
        } else {
            localStorage.removeItem(FOCUS_PROJECT_KEY);
            setFocusProjectId(null);
        }
    };

    return {
        focusProjectId,
        setFocus,
        clearFocus: () => setFocus(null)
    };
};
