import './Wardrobe.scss'
import React, { useEffect } from "react"
import { useWardrobe } from './useWardrobe';
import { wardrobeApi } from './wardrobeApi';

interface WardrobeItem {
    id: number;
    file_path: string;
    url: string;
    upload_time: string;
    tags: string;
    alt_text: string;
}

function Wardrobe() {
    const { isLoading, success, error, wardrobeItems, fetchWardrobe } = useWardrobe();

    useEffect(() => {
        fetchWardrobe();
    }, [wardrobeItems]);

    const handleDelete = (itemId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        wardrobeApi.deleteItem(itemId);
    };

    const makeWardrobeItemCard = (item: WardrobeItem) => {
        const tagArray = item.tags ? item.tags.split(',').map(tag => tag.trim()) : [];

        return (
            <div className="wardrobe_item_card" key={item.id}>
                <img src={item.url} alt={item.alt_text || 'Wardrobe item'} />
                <h3>{item.alt_text || 'Untitled'}</h3>

                <div className="card-overlay">
                    <div className="overlay-top">
                        <p
                            className="delete-btn"
                            onClick={(e) => handleDelete(item.id, e)}>
                            Delete
                        </p>
                    </div>
                    <hr className='divider' />
                    <div className="overlay-bottom">
                        <div className="tags">
                            {tagArray.length > 0 ? (
                                tagArray.map((tag, index) => (
                                    <span key={index} className="tag">{tag}</span>
                                ))
                            ) : (
                                <span className="tag">No tags</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className='wardrobe_container'>
            <h1 className='wardrobe_heading'>Your Wardrobe</h1>      
            {isLoading && <p className="status">Loading wardrobe...</p>}
            {error && <p className="error">Error: {error}</p>}

            <div className='wardrobe_grid'>
                {wardrobeItems.map((item) => makeWardrobeItemCard(item))}
            </div>
        </div>
    );
}

export default Wardrobe