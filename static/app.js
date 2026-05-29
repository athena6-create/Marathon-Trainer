// Fetch and display training plan
fetch('/api/plan')
    .then(response => response.json())
    .then(data => {
        document.getElementById('plan-container').innerHTML = `
            <p>${data.plan}</p>
        `;
    })
    .catch(error => {
        console.error('Error fetching plan:', error);
        document.getElementById('plan-container').innerHTML = '<p>Error loading plan</p>';
    });
