import React from 'react';

const SelectedStore = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  const stores = [
    { id: 1, name: 'Store A', location: 'City A' },
    { id: 2, name: 'Store B', location: 'City B' },
    { id: 3, name: 'Store C', location: 'City C' },
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Select a Store
          </h3>
          <div className="space-y-2">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => onSelect(store)}
                className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium">{store.name}</div>
                <div className="text-sm text-gray-500">{store.location}</div>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectedStore;
