import fetch from 'node-fetch';
import { analyticsProcessor } from './utils';

jest.mock('node-fetch', () => jest.fn());

afterEach(() => {
    jest.clearAllMocks();
});

test('test_analytics_processor_track_feature_updates_analytics_data', () => {
    const aP = analyticsProcessor();
    aP.trackFeature("myFeature");
    expect(aP.analyticsData["myFeature"]).toBe(1);

    aP.trackFeature("myFeature");
    expect(aP.analyticsData["myFeature"]).toBe(2);
});

test('test_analytics_processor_flush_clears_analytics_data', async () => {
    const aP = analyticsProcessor();
    aP.trackFeature("myFeature");
    await aP.flush();
    expect(aP.analyticsData).toStrictEqual({});
});

test('test_analytics_processor_flush_post_request_data_match_ananlytics_data', async () => {
    const aP = analyticsProcessor();
    aP.trackFeature("myFeature1");
    aP.trackFeature("myFeature2");
    await aP.flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://testUrlanalytics/flags/', {
        body: '{"myFeature1":1,"myFeature2":1}',
        headers: { 'Content-Type': 'application/json', 'X-Environment-Key': 'test-key' },
        method: 'POST',
        timeout: 3000
    });
});

jest.useFakeTimers()
test('test_analytics_processor_flush_post_request_data_match_ananlytics_data_test', async () => {
    const aP = analyticsProcessor();
    aP.trackFeature("myFeature1");
    setTimeout(() => {
        aP.trackFeature("myFeature2");
        expect(fetch).toHaveBeenCalledTimes(1);
    }, 15000);
    jest.runOnlyPendingTimers();
});

test('test_analytics_processor_flush_early_exit_if_analytics_data_is_empty', async () => {
    const aP = analyticsProcessor();
    await aP.flush();
    expect(fetch).not.toHaveBeenCalled();
});


test('fetch errors are swallowed', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('some error'));

    const processor = analyticsProcessor();
    processor.trackFeature('myFeature');

    await processor.flush();

    expect(fetch).toHaveBeenCalled();
})
